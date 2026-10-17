// The template studio: a full-screen editor in the spirit of SCRL. Pages sit
// in a sideways strip like an Instagram carousel; photos, stickers and words
// are moved with a finger (or mouse), and everything is pure DOM transforms.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BackIcon,
  CopyIcon,
  EditIcon,
  FitIcon,
  FlipIcon,
  FrontIcon,
  LayoutIcon,
  PhotosIcon,
  PlusIcon,
  RedoIcon,
  ShareIcon,
  StickerIcon,
  SwapIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
} from "../components/Icons";
import { analyzeExtra } from "../lib/analyze";
import { bnNum } from "../lib/bn";
import type { Photo } from "../lib/types";
import { setScene } from "../three/store";
import { ExportSheet } from "./ExportSheet";
import { MAX_ZOOM, place } from "./geometry";
import { transform, type Pt, type Target } from "./gestures";
import { PageView, type Live, type Sel } from "./PageView";
import { PhotoPanel, StickerPanel, TemplatePanel, TextPanel, type TextDraft } from "./Panels";
import { autofill, fillFor, layoutOf, makePage, updatePage, usedPhotoIds, withFormat, withTemplate, type HistoryAction } from "./project";
import { pageSize } from "./render";
import { stickerById } from "./stickers";
import { availableFormats, templateById } from "./templates";
import { FORMATS, uid, type Fill, type Format, type Page, type Project, type StickerItem, type TextItem } from "./types";
import "./studio.css";

type Tool = "templates" | "photos" | "stickers" | "text";
type PageSel = Sel & { pageId: string };
type PageLive = Live & { pageId: string };

type Gesture = {
  pageId: string;
  hit: string;
  id: string | null;
  target: Target | null;
  pointers: Map<number, Pt>;
  start: Pt[];
  scale: number;
  moved: boolean;
  down: Pt;
  wasSelected: boolean;
};

const TOOLS: Array<[Tool, string, typeof LayoutIcon]> = [
  ["templates", "টেমপ্লেট", LayoutIcon],
  ["photos", "ছবি", PhotosIcon],
  ["stickers", "স্টিকার", StickerIcon],
  ["text", "লেখা", TextIcon],
];

function useWide() {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

function applyLive(page: Page, l: Live): Page {
  if (l.kind === "slot") return { ...page, fills: { ...page.fills, [l.id]: l.fill } };
  if (l.kind === "sticker") return { ...page, stickers: page.stickers.map((s) => (s.id === l.id ? l.item : s)) };
  return { ...page, texts: page.texts.map((t) => (t.id === l.id ? { ...l.item, fromTemplate: false } : t)) };
}

export function Studio({
  project,
  dispatch,
  canUndo,
  canRedo,
  photo,
  ai,
  mine,
  rest,
  onAddPhotos,
  caption,
  startPage = 0,
  onClose,
}: {
  project: Project;
  dispatch: Dispatch<HistoryAction>;
  canUndo: boolean;
  canRedo: boolean;
  photo: (id: string) => Photo | undefined;
  ai: Photo[];
  mine: Photo[];
  rest: Photo[];
  onAddPhotos: (photos: Photo[]) => void;
  caption?: string;
  startPage?: number;
  onClose: () => void;
}) {
  const wide = useWide();
  const [tool, setTool] = useState<Tool | null>(null);
  const [rightTool, setRightTool] = useState<Exclude<Tool, "photos">>("templates");
  const [sel, setSel] = useState<PageSel | null>(null);
  const [live, setLive] = useState<PageLive | null>(null);
  const [current, setCurrent] = useState(Math.min(startPage, project.pages.length - 1));
  const [exporting, setExporting] = useState(false);
  const [adding, setAdding] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const liveRef = useRef<PageLive | null>(null);
  const raf = useRef(0);
  const extraCount = useRef(0);

  const format = project.format;
  const pages = project.pages;
  const page = pages[Math.min(current, pages.length - 1)];
  const used = useMemo(() => usedPhotoIds(project), [project]);

  const say = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((x) => (x === t ? null : x)), 2400);
  }, []);

  const commit = useCallback((next: Project) => dispatch({ type: "set", project: next }), [dispatch]);

  // Freeze the page behind and the 3D scene while the studio is open.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    setScene({ hold: true });
    return () => {
      html.style.overflow = prev;
      setScene({ hold: false });
    };
  }, []);

  // ---------- which page is in front ----------

  const scrollToPage = useCallback((i: number, smooth = true) => {
    const el = strip.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", inline: "center", block: "nearest" });
  }, []);

  useLayoutEffect(() => {
    scrollToPage(current, false);
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestD = Infinity;
        Array.from(el.children).forEach((c, i) => {
          if (!(c as HTMLElement).dataset.pageIndex) return;
          const h = c as HTMLElement;
          const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setCurrent(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (current > pages.length - 1) setCurrent(pages.length - 1);
  }, [pages.length, current]);

  // ---------- live edits ----------

  const showLive = (l: PageLive | null) => {
    liveRef.current = l;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setLive(liveRef.current));
  };

  const commitLive = useCallback(() => {
    const l = liveRef.current;
    liveRef.current = null;
    cancelAnimationFrame(raf.current);
    setLive(null);
    if (l) commit(updatePage(project, l.pageId, (p) => applyLive(p, l)));
  }, [commit, project]);

  const currentValue = (pageObj: Page, kind: string, id: string) => {
    const l = liveRef.current;
    if (l && l.pageId === pageObj.id && l.id === id) return l.kind === "slot" ? l.fill : l.item;
    if (kind === "slot") return pageObj.fills[id];
    if (kind === "sticker") return pageObj.stickers.find((s) => s.id === id);
    return pageObj.texts.find((t) => t.id === id);
  };

  const rebase = (g: Gesture, pageObj: Page) => {
    g.start = [...g.pointers.values()];
    if (!g.target) return;
    const kind = g.target.kind === "rotate" ? g.target.of : g.target.kind;
    const v = currentValue(pageObj, kind, g.target.id);
    if (v) g.target = { ...g.target, value: v } as Target;
  };

  const pageGeometry = (pageObj: Page, el: HTMLElement) => {
    const pv = el.querySelector(".pv") as HTMLElement;
    const rect = pv.getBoundingClientRect();
    const { W, H } = pageSize(format, templateById(pageObj.template));
    return { rect, W, H, scale: rect.width / W };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, pageObj: Page, index: number) => {
    const el = e.currentTarget;
    const pt = { x: e.clientX, y: e.clientY };
    const g = gesture.current;
    if (g && g.pageId === pageObj.id && g.target && !g.pointers.has(e.pointerId)) {
      g.pointers.set(e.pointerId, pt);
      el.setPointerCapture(e.pointerId);
      g.moved = true;
      rebase(g, pageObj);
      return;
    }
    if (index !== current) setCurrent(index);
    const hitEl = (e.target as HTMLElement).closest<HTMLElement>("[data-hit]");
    const hit = hitEl?.dataset.hit ?? "bg";
    const id = hitEl?.dataset.id ?? null;
    const { rect, scale } = pageGeometry(pageObj, el);
    const wasSelected = Boolean(sel && sel.pageId === pageObj.id && sel.id === id);
    let target: Target | null = null;

    if (hit === "slot" && id) {
      const slot = layoutOf(pageObj.template, format).layout.slots.find((s) => s.id === id);
      const fill = pageObj.fills[id];
      const p = fill ? photo(fill.photoId) : undefined;
      // On touch an unselected photo lets the strip scroll; tap it first to adjust.
      if (slot && fill && p && (e.pointerType === "mouse" || wasSelected)) {
        target = { kind: "slot", id, slot, aspect: p.width / p.height, value: fill };
        setSel({ kind: "slot", id, pageId: pageObj.id });
      }
    } else if ((hit === "sticker" || hit === "text") && id) {
      const v = hit === "sticker" ? pageObj.stickers.find((s) => s.id === id) : pageObj.texts.find((t) => t.id === id);
      if (v) {
        target = hit === "sticker" ? { kind: "sticker", id, value: v as StickerItem } : { kind: "text", id, value: v as TextItem };
        setSel({ kind: hit, id, pageId: pageObj.id });
      }
    } else if (hit === "rotate" && id) {
      const st = pageObj.stickers.find((s) => s.id === id);
      const tx = pageObj.texts.find((t) => t.id === id);
      const v = st ?? tx;
      if (v) {
        target = {
          kind: "rotate",
          id,
          of: st ? "sticker" : "text",
          value: v,
          anchor: { x: rect.left + v.x * scale, y: rect.top + v.y * scale },
        };
      }
    }

    gesture.current = {
      pageId: pageObj.id,
      hit,
      id,
      target,
      pointers: new Map([[e.pointerId, pt]]),
      start: [pt],
      scale,
      moved: false,
      down: pt,
      wasSelected,
    };
    if (target) {
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !g.pointers.has(e.pointerId)) return;
    const pt = { x: e.clientX, y: e.clientY };
    g.pointers.set(e.pointerId, pt);
    if (!g.moved && Math.hypot(pt.x - g.down.x, pt.y - g.down.y) > 5) g.moved = true;
    if (!g.target || !g.moved) return;
    const value = transform(g.target, g.start, [...g.pointers.values()], g.scale);
    const t = g.target;
    if (t.kind === "slot") showLive({ pageId: g.pageId, kind: "slot", id: t.id, fill: value as Fill });
    else {
      const kind = t.kind === "rotate" ? t.of : t.kind;
      showLive({ pageId: g.pageId, kind, id: t.id, item: value } as PageLive);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>, pageObj: Page) => {
    const g = gesture.current;
    if (!g || !g.pointers.has(e.pointerId)) return;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size > 0) {
      rebase(g, pageObj);
      return;
    }
    gesture.current = null;
    if (e.type === "pointercancel") {
      if (g.moved && g.target) commitLive();
      return;
    }
    if (g.moved && g.target) {
      commitLive();
      return;
    }
    // A tap.
    if (g.hit === "remove" && g.id) {
      removeItem(pageObj.id, g.id);
      return;
    }
    if (g.hit === "slot" && g.id) {
      setSel({ kind: "slot", id: g.id, pageId: pageObj.id });
      if (!pageObj.fills[g.id] || g.wasSelected) openTool("photos");
      return;
    }
    if (g.hit === "text" && g.id && g.wasSelected) {
      openTool("text");
      return;
    }
    if (g.hit === "bg") setSel(null);
  };

  // Desktop: drop a photo from the panel straight onto a slot.
  const onDrop = (e: React.DragEvent<HTMLDivElement>, pageObj: Page) => {
    const id = e.dataTransfer.getData("text/x-photo");
    const slotEl = (e.target as HTMLElement).closest<HTMLElement>("[data-hit=slot]");
    if (!id || !slotEl?.dataset.id) return;
    e.preventDefault();
    const p = photo(id);
    if (!p) return;
    commit(updatePage(project, pageObj.id, (pg) => ({ ...pg, fills: { ...pg.fills, [slotEl.dataset.id!]: fillFor(p) } })));
    setSel({ kind: "slot", id: slotEl.dataset.id, pageId: pageObj.id });
  };

  // Mouse wheel / trackpad: zoom a photo, resize a sticker or words.
  const wheelTimer = useRef(0);
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const hitEl = (e.target as HTMLElement).closest<HTMLElement>("[data-hit]");
      const pageEl = (e.target as HTMLElement).closest<HTMLElement>("[data-page-index]");
      if (!hitEl || !pageEl || !hitEl.dataset.id) return;
      const pageObj = pages[Number(pageEl.dataset.pageIndex)];
      const kind = hitEl.dataset.hit;
      if (!pageObj || (kind !== "slot" && kind !== "sticker" && kind !== "text")) return;
      const id = hitEl.dataset.id;
      const v = currentValue(pageObj, kind, id);
      if (!v) return;
      e.preventDefault();
      const k = Math.exp(-e.deltaY * 0.0016);
      if (kind === "slot") {
        const f = v as Fill;
        const p = photo(f.photoId);
        const slot = layoutOf(pageObj.template, format).layout.slots.find((s) => s.id === id);
        if (!p || !slot) return;
        const zoom = Math.min(MAX_ZOOM, Math.max(1, f.zoom * k));
        const pl = place(slot.w, slot.h, p.width / p.height, { ...f, zoom });
        showLive({ pageId: pageObj.id, kind: "slot", id, fill: { ...f, zoom, cx: pl.cx, cy: pl.cy } });
      } else {
        const item = v as StickerItem | TextItem;
        const size = kind === "sticker" ? Math.min(3200, Math.max(40, item.size * k)) : Math.min(640, Math.max(14, item.size * k));
        showLive({ pageId: pageObj.id, kind, id, item: { ...item, size } } as PageLive);
      }
      setSel({ kind: kind as Sel["kind"], id, pageId: pageObj.id });
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => commitLiveRef.current(), 350);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });
  const commitLiveRef = useRef(commitLive);
  commitLiveRef.current = commitLive;

  // ---------- actions ----------

  const openTool = (t: Tool) => {
    if (wide) {
      if (t !== "photos") setRightTool(t);
      return;
    }
    setTool(t);
  };

  const selPage = sel ? pages.find((p) => p.id === sel.pageId) : undefined;
  const selItem =
    sel && selPage
      ? sel.kind === "sticker"
        ? selPage.stickers.find((s) => s.id === sel.id)
        : sel.kind === "text"
          ? selPage.texts.find((t) => t.id === sel.id)
          : undefined
      : undefined;
  const selText = sel?.kind === "text" ? (selItem as TextItem | undefined) ?? null : null;

  const removeItem = (pageId: string, id: string) => {
    commit(
      updatePage(project, pageId, (p) => ({
        ...p,
        stickers: p.stickers.filter((s) => s.id !== id),
        texts: p.texts.filter((t) => t.id !== id),
      })),
    );
    setSel(null);
  };

  const patchSelected = (patch: Partial<StickerItem> & Partial<TextItem>) => {
    if (!sel || !selPage) return;
    commit(
      updatePage(project, selPage.id, (p) => ({
        ...p,
        stickers: p.stickers.map((s) => (s.id === sel.id ? { ...s, ...patch } : s)),
        texts: p.texts.map((t) => (t.id === sel.id ? { ...t, ...patch, fromTemplate: false } : t)),
      })),
    );
  };

  const duplicateSelected = () => {
    if (!sel || !selPage || !selItem) return;
    const nid = uid(sel.kind === "sticker" ? "s" : "t");
    const copy = { ...selItem, id: nid, x: selItem.x + 50, y: selItem.y + 50, fromTemplate: false };
    commit(
      updatePage(project, selPage.id, (p) =>
        sel.kind === "sticker"
          ? { ...p, stickers: [...p.stickers, copy as StickerItem] }
          : { ...p, texts: [...p.texts, { ...(copy as TextItem), bind: undefined, text: (copy as TextItem).text }] },
      ),
    );
    setSel({ ...sel, id: nid });
  };

  const bringFront = () => {
    if (!sel || !selPage) return;
    commit(
      updatePage(project, selPage.id, (p) => ({
        ...p,
        stickers: [...p.stickers.filter((s) => s.id !== sel.id), ...p.stickers.filter((s) => s.id === sel.id)],
        texts: [...p.texts.filter((t) => t.id !== sel.id), ...p.texts.filter((t) => t.id === sel.id)],
      })),
    );
  };

  const setFill = (pageId: string, slotId: string, fill: Fill | null) =>
    commit(updatePage(project, pageId, (p) => ({ ...p, fills: { ...p.fills, [slotId]: fill } })));

  // Where the next photo goes: the chosen slot, else the first empty one on this page.
  const placePhoto = (id: string) => {
    const p = photo(id);
    if (!p) return;
    const targetPage = sel?.kind === "slot" && selPage ? selPage : page;
    const slots = layoutOf(targetPage.template, format).layout.slots;
    const slotId = sel?.kind === "slot" && selPage ? sel.id : slots.find((s) => !targetPage.fills[s.id])?.id;
    if (!slotId) {
      say("এই পাতায় ফাঁকা জায়গা নেই। যে ছবিটা বদলাবে, আগে সেটায় ট্যাপ করো।");
      return;
    }
    const fills = { ...targetPage.fills, [slotId]: fillFor(p) };
    commit(updatePage(project, targetPage.id, (pg) => ({ ...pg, fills })));
    const next = slots.find((s) => !fills[s.id]);
    setSel({ kind: "slot", id: next?.id ?? slotId, pageId: targetPage.id });
    if (!next && !wide) setTool(null);
  };

  const addFiles = async (files: File[]) => {
    const list = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)).slice(0, 20);
    if (!list.length) return;
    setAdding(list.length);
    const made: Photo[] = [];
    for (const f of list) {
      const n = ++extraCount.current;
      const p = await analyzeExtra(f, `x${n}-${Date.now().toString(36)}`, 10000 + n).catch(() => null);
      if (p) made.push(p);
      setAdding((a) => Math.max(0, a - 1));
    }
    setAdding(0);
    if (!made.length) {
      say("ছবিটা খোলা গেল না। JPG বা PNG দিয়ে দেখো।");
      return;
    }
    onAddPhotos(made);
    // One photo for a chosen slot: put it straight in.
    if (made.length === 1 && sel?.kind === "slot" && selPage) {
      setFill(selPage.id, sel.id, fillFor(made[0]));
      say("তোমার ছবি বসিয়ে দিলাম");
    } else {
      say(`${bnNum(made.length)}টা ছবি যোগ হল। ট্যাপ করে বসাও।`);
    }
  };

  const doAutofill = () => {
    const next = autofill(project, [...mine, ...ai, ...rest.filter((p) => p.status === "ok")]);
    if (next === project || next.pages.every((p, i) => p === project.pages[i])) say("ফাঁকা জায়গা নেই");
    else commit(next);
  };

  const visibleCenter = (pageObj: Page, index: number) => {
    const { W, H } = pageSize(format, templateById(pageObj.template));
    const el = strip.current?.children[index] as HTMLElement | undefined;
    const pv = el?.querySelector(".pv") as HTMLElement | null;
    const box = strip.current?.getBoundingClientRect();
    if (!pv || !box) return { x: W / 2, y: H / 2, W, H };
    const r = pv.getBoundingClientRect();
    const x = ((box.left + box.width / 2 - r.left) / r.width) * W;
    return { x: Math.min(W - 160, Math.max(160, x)), y: H / 2, W, H };
  };

  const stickerItem = (kind: string, x: number, y: number): StickerItem | null => {
    const def = stickerById(kind);
    if (!def) return null;
    const ratio = def.w > 0 ? def.h / def.w : 1;
    return { id: uid("s"), kind, x, y, size: ratio > 1 ? 340 / ratio : 340, rotate: 0 };
  };

  const addSticker = (kind: string) => {
    const c = visibleCenter(page, current);
    const item = stickerItem(kind, c.x, c.y);
    if (!item) return;
    commit(updatePage(project, page.id, (p) => ({ ...p, stickers: [...p.stickers, item] })));
    setSel({ kind: "sticker", id: item.id, pageId: page.id });
    if (!wide) setTool(null);
  };

  // A sticker dragged out of the panel lands where it was let go, on whichever page is there.
  const dropSticker = (kind: string, clientX: number, clientY: number) => {
    const pageEl = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-page-index]");
    const pageObj = pageEl ? pages[Number(pageEl.dataset.pageIndex)] : undefined;
    const pv = pageEl?.querySelector<HTMLElement>(".pv");
    if (!pageObj || !pv) return false;
    const r = pv.getBoundingClientRect();
    const { W, H } = pageSize(format, templateById(pageObj.template));
    const item = stickerItem(kind, ((clientX - r.left) / r.width) * W, ((clientY - r.top) / r.height) * H);
    if (!item) return false;
    commit(updatePage(project, pageObj.id, (p) => ({ ...p, stickers: [...p.stickers, item] })));
    setSel({ kind: "sticker", id: item.id, pageId: pageObj.id });
    return true;
  };

  const addText = (d: TextDraft) => {
    const c = visibleCenter(page, current);
    const item: TextItem = { id: uid("t"), ...d, x: c.x, y: c.y, size: 92, rotate: 0, align: "center" };
    commit(updatePage(project, page.id, (p) => ({ ...p, texts: [...p.texts, item] })));
    setSel({ kind: "text", id: item.id, pageId: page.id });
    if (!wide) setTool(null);
  };

  // New template on this page: its photos move over, and any extra windows
  // fill with photos not used anywhere yet (AI picks first).
  const pickTemplate = (id: string) => {
    const moved = updatePage(project, page.id, (p) => withTemplate(p, id, format));
    const changed = moved.pages.find((p) => p.id === page.id)!;
    const others = { ...moved, pages: moved.pages.filter((p) => p.id !== page.id) };
    const pool = [...ai, ...mine, ...rest.filter((p) => p.status === "ok")].filter((p) => !usedPhotoIds(others).has(p.id));
    const filled = autofill({ format, pages: [changed] }, pool).pages[0];
    commit(updatePage(moved, page.id, () => filled));
    setSel(null);
  };

  const setFormat = (f: Format) => {
    if (f === format) return;
    commit(withFormat(project, f));
    setSel(null);
  };

  const addPage = () => {
    const tpl = page?.template ?? "lalpar";
    const np = makePage(tpl, format);
    const at = current + 1;
    commit({ ...project, pages: [...pages.slice(0, at), np, ...pages.slice(at)] });
    setSel(null);
    requestAnimationFrame(() => {
      setCurrent(at);
      scrollToPage(at);
    });
    openTool("templates");
  };

  const copyPage = () => {
    const cp: Page = {
      ...page,
      id: uid("pg"),
      stickers: page.stickers.map((s) => ({ ...s, id: uid("s") })),
      texts: page.texts.map((t) => ({ ...t, id: uid("t") })),
    };
    const at = current + 1;
    commit({ ...project, pages: [...pages.slice(0, at), cp, ...pages.slice(at)] });
    requestAnimationFrame(() => scrollToPage(at));
  };

  const deletePage = () => {
    if (pages.length < 2) return;
    commit({ ...project, pages: pages.filter((p) => p.id !== page.id) });
    setSel(null);
    say("পাতা মুছে দিলাম। ফেরাতে চাইলে পিছনের তীর চাপো।");
  };

  const movePage = (dir: -1 | 1) => {
    const to = current + dir;
    if (to < 0 || to >= pages.length) return;
    const next = [...pages];
    [next[current], next[to]] = [next[to], next[current]];
    commit({ ...project, pages: next });
    requestAnimationFrame(() => {
      setCurrent(to);
      scrollToPage(to);
    });
  };

  // ---------- keyboard ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if ((e.key === "Delete" || e.key === "Backspace") && !typing && sel && sel.kind !== "slot") {
        e.preventDefault();
        removeItem(sel.pageId, sel.id);
      } else if (e.key === "Escape" && !exporting) {
        if (tool) setTool(null);
        else if (sel) setSel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------- pieces ----------

  const slideCount = pages.reduce((n, p) => n + (templateById(p.template).span ?? 1), 0);
  const hint =
    sel?.kind === "slot"
      ? "যে ছবিতে ট্যাপ করবে, সেটা বাছা জায়গায় বসবে।"
      : "ট্যাপ করলে এই পাতার প্রথম ফাঁকা জায়গায় বসবে। আগে পাতার কোনো ছবিতে ট্যাপ করলে সেটা বদলাবে।";

  const photoPanel = (
    <PhotoPanel ai={ai} mine={mine} rest={rest} used={used} adding={adding} hint={hint} onPick={placePhoto} onFiles={addFiles} onAutofill={doAutofill} />
  );
  const panelFor = (t: Tool) =>
    t === "templates" ? (
      <TemplatePanel format={format} current={page?.template} onPick={pickTemplate} />
    ) : t === "photos" ? (
      photoPanel
    ) : t === "stickers" ? (
      <StickerPanel onSticker={addSticker} onText={addText} onDropAt={dropSticker} />
    ) : (
      <TextPanel item={selText} onAdd={addText} onChange={(patch) => patchSelected(patch)} />
    );

  const selSlotFill = sel?.kind === "slot" && selPage ? selPage.fills[sel.id] : null;

  const contextBar = sel && selPage && (
    <div className="ctx-bar" role="toolbar" aria-label="বাছা জিনিসের কাজ">
      {sel.kind === "slot" && (
        <>
          <button type="button" onClick={() => openTool("photos")}>
            <SwapIcon /> {selSlotFill ? "ছবি বদলাও" : "ছবি দাও"}
          </button>
          {selSlotFill && (
            <>
              <button type="button" onClick={() => setFill(selPage.id, sel.id, fillFor(photo(selSlotFill.photoId)!))}>
                <FitIcon /> ঠিক মাপে
              </button>
              <button type="button" onClick={() => setFill(selPage.id, sel.id, null)}>
                <TrashIcon /> সরাও
              </button>
            </>
          )}
          {selSlotFill && <span className="ctx-tip">টেনে সরাও, দু আঙুলে বড় করো</span>}
        </>
      )}
      {sel.kind !== "slot" && selItem && (
        <>
          {sel.kind === "text" && (
            <button type="button" onClick={() => openTool("text")}>
              <EditIcon /> লেখা বদলাও
            </button>
          )}
          {sel.kind === "sticker" && (
            <button type="button" onClick={() => patchSelected({ flip: !(selItem as StickerItem).flip })}>
              <FlipIcon /> উল্টাও
            </button>
          )}
          <button type="button" onClick={duplicateSelected}>
            <CopyIcon /> কপি
          </button>
          <button type="button" onClick={bringFront}>
            <FrontIcon /> সামনে আনো
          </button>
          <button type="button" onClick={() => removeItem(selPage.id, sel.id)}>
            <TrashIcon /> মুছে দাও
          </button>
        </>
      )}
    </div>
  );

  return (
    <motion.div
      className={wide ? "studio studio-wide" : "studio"}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-label="টেমপ্লেট স্টুডিও"
    >
      <header className="st-head">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="ফিরে যাও">
          <BackIcon />
        </button>
        <div className="seg" role="group" aria-label="মাপ">
          {(Object.keys(FORMATS) as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={format === f}
              disabled={!availableFormats().includes(f)}
              onClick={() => setFormat(f)}
            >
              {FORMATS[f].label} <small>{FORMATS[f].short}</small>
            </button>
          ))}
        </div>
        <div className="st-head-right">
          <button type="button" className="icon-btn" disabled={!canUndo} onClick={() => dispatch({ type: "undo" })} aria-label="আগের অবস্থায় ফেরো">
            <UndoIcon />
          </button>
          <button type="button" className="icon-btn" disabled={!canRedo} onClick={() => dispatch({ type: "redo" })} aria-label="আবার করো">
            <RedoIcon />
          </button>
          <button type="button" className="btn btn-primary btn-small st-share" onClick={() => setExporting(true)}>
            <ShareIcon /> <span>তৈরি করো</span>
          </button>
        </div>
      </header>

      <div className="st-body">
        {wide && (
          <aside className="st-side st-left">
            <h3 className="side-title">ছবি</h3>
            {photoPanel}
          </aside>
        )}

        <main className="st-main">
          <div className="st-stage">
            <div className="st-strip" ref={strip} style={{ ["--ar" as string]: FORMATS[format].w / FORMATS[format].h }}>
              {pages.map((p, i) => {
                const span = templateById(p.template).span ?? 1;
                const f = FORMATS[format];
                return (
                  <div
                    key={p.id}
                    className="st-page"
                    data-page-index={i}
                    data-current={i === current || undefined}
                    data-wide={span > 1 || undefined}
                    style={{ ["--ar" as string]: f.w / f.h, ["--span" as string]: span }}
                    onPointerDown={(e) => onPointerDown(e, p, i)}
                    onPointerMove={onPointerMove}
                    onPointerUp={(e) => onPointerUp(e, p)}
                    onPointerCancel={(e) => onPointerUp(e, p)}
                    onDragOver={(e) => e.dataTransfer.types.includes("text/x-photo") && e.preventDefault()}
                    onDrop={(e) => onDrop(e, p)}
                  >
                    <PageView
                      page={p}
                      format={format}
                      photo={photo}
                      interactive
                      live={live && live.pageId === p.id ? live : null}
                      selected={sel && sel.pageId === p.id ? sel : null}
                    />
                    {span > 1 &&
                      Array.from({ length: span }, (_, k) => (
                        <span key={k} className="st-snap" style={{ left: `${((k + 0.5) / span) * 100}%` }} />
                      ))}
                  </div>
                );
              })}
              <button type="button" className="st-addpage" onClick={addPage}>
                <PlusIcon />
                <span>নতুন পাতা</span>
              </button>
            </div>
          </div>

          <div className="st-pagebar">
            <span className="st-count">
              পাতা {bnNum(Math.min(current + 1, pages.length))}/{bnNum(pages.length)}
              {slideCount !== pages.length && <small> · Instagram-এ {bnNum(slideCount)}টা ছবি</small>}
            </span>
            <div className="st-page-tools">
              <button type="button" className="icon-btn" onClick={() => movePage(-1)} disabled={current === 0} aria-label="পাতা বাঁদিকে সরাও">
                <ArrowLeftIcon />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => movePage(1)}
                disabled={current >= pages.length - 1}
                aria-label="পাতা ডানদিকে সরাও"
              >
                <ArrowRightIcon />
              </button>
              <button type="button" className="icon-btn" onClick={copyPage} aria-label="পাতা কপি করো">
                <CopyIcon />
              </button>
              <button type="button" className="icon-btn" onClick={deletePage} disabled={pages.length < 2} aria-label="পাতা মুছে দাও">
                <TrashIcon />
              </button>
            </div>
          </div>

          {contextBar}
        </main>

        {wide && (
          <aside className="st-side st-right">
            <div className="side-tabs" role="tablist">
              {TOOLS.filter(([t]) => t !== "photos").map(([t, label, Icon]) => (
                <button key={t} role="tab" type="button" aria-selected={rightTool === t} onClick={() => setRightTool(t as Exclude<Tool, "photos">)}>
                  <Icon /> {label}
                </button>
              ))}
            </div>
            {panelFor(rightTool)}
          </aside>
        )}
      </div>

      {!wide && (
        <>
          <AnimatePresence initial={false}>
            {tool && (
              <motion.section
                key={tool}
                className="st-panel"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {panelFor(tool)}
              </motion.section>
            )}
          </AnimatePresence>
          <nav className="st-dock" aria-label="সরঞ্জাম">
            {TOOLS.map(([t, label, Icon]) => (
              <button key={t} type="button" aria-pressed={tool === t} onClick={() => setTool(tool === t ? null : t)}>
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      <AnimatePresence>
        {exporting && (
          <ExportSheet key="export" project={project} photo={photo} caption={caption} onClose={() => setExporting(false)} onToast={say} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast st-toast" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
