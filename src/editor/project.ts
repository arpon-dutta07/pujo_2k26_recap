// Building and changing projects. Every function returns a new object, so
// undo is just a list of old projects.
import { focusOf } from "../lib/render/draw";
import type { Photo } from "../lib/types";
import { pageSize } from "./render";
import { templateById } from "./templates";
import { uid, type Fill, type Format, type Page, type Project, type SlotDef, type StickerItem, type TextItem } from "./types";

export const fillFor = (p: Photo): Fill => {
  const f = focusOf(p);
  return { photoId: p.id, zoom: 1, cx: f.x, cy: f.y };
};

export function layoutOf(templateId: string, format: Format) {
  const def = templateById(templateId);
  const { W, H } = pageSize(format, def);
  return { def, W, H, layout: def.layout(W, H) };
}

export const slotsOf = (page: Page, format: Format): SlotDef[] => layoutOf(page.template, format).layout.slots;

function templateItems(templateId: string, format: Format) {
  const { layout } = layoutOf(templateId, format);
  const texts: TextItem[] = (layout.texts ?? []).map((t) => ({
    rotate: 0,
    align: "center",
    style: "plain",
    ...t,
    id: uid("t"),
    fromTemplate: true,
  }));
  const stickers: StickerItem[] = (layout.stickers ?? []).map((s) => ({ rotate: 0, ...s, id: uid("s"), fromTemplate: true }));
  return { slots: layout.slots, texts, stickers };
}

export function makePage(templateId: string, format: Format, photos: Array<Photo | undefined> = []): Page {
  const { slots, texts, stickers } = templateItems(templateId, format);
  const fills: Page["fills"] = {};
  slots.forEach((s, i) => (fills[s.id] = photos[i] ? fillFor(photos[i]!) : null));
  return { id: uid("pg"), template: templateById(templateId).id, fills, texts, stickers };
}

// New template on an existing page: photos move over in slot order, and
// anything the visitor added stays (stretched if the page got wider).
export function withTemplate(page: Page, templateId: string, format: Format): Page {
  const before = layoutOf(page.template, format);
  const kept = before.layout.slots.map((s) => page.fills[s.id]).filter((f): f is Fill => Boolean(f));
  const next = makePage(templateId, format);
  const after = layoutOf(templateId, format);
  after.layout.slots.forEach((s, i) => (next.fills[s.id] = kept[i] ?? null));
  const kx = after.W / before.W;
  return {
    ...next,
    id: page.id,
    texts: [...next.texts, ...page.texts.filter((t) => !t.fromTemplate).map((t) => ({ ...t, x: t.x * kx }))],
    stickers: [...next.stickers, ...page.stickers.filter((s) => !s.fromTemplate).map((s) => ({ ...s, x: s.x * kx }))],
  };
}

// 4:5 <-> 9:16. Template words and stickers are laid out again (keeping any
// changed wording); the visitor's own ones keep their relative height.
export function withFormat(project: Project, format: Format): Project {
  if (project.format === format) return project;
  const pages = project.pages.map((page) => {
    const before = layoutOf(page.template, project.format);
    const fresh = templateItems(page.template, format);
    const after = layoutOf(page.template, format);
    const ky = after.H / before.H;
    const oldTpl = page.texts.filter((t) => t.fromTemplate);
    const texts = fresh.texts.map((t, i) => (oldTpl[i] ? { ...t, text: oldTpl[i].text } : t));
    return {
      ...page,
      texts: [...texts, ...page.texts.filter((t) => !t.fromTemplate).map((t) => ({ ...t, y: t.y * ky }))],
      stickers: [...fresh.stickers, ...page.stickers.filter((s) => !s.fromTemplate).map((s) => ({ ...s, y: s.y * ky }))],
    };
  });
  return { format, pages };
}

export const usedPhotoIds = (project: Project) => {
  const ids = new Set<string>();
  for (const p of project.pages) for (const f of Object.values(p.fills)) if (f) ids.add(f.photoId);
  return ids;
};

// Biggest empty slot first gets the next best photo; round "thakur" slots
// prefer photos without faces and the other way round.
export function autofill(project: Project, pool: Photo[]): Project {
  const used = usedPhotoIds(project);
  const free = pool.filter((p) => !used.has(p.id));
  const take = (role?: SlotDef["role"]) => {
    if (!free.length) return undefined;
    let i = -1;
    if (role === "thakur") i = free.findIndex((p) => p.kind === "thakur");
    if (role === "people" || role === "hero") i = free.findIndex((p) => p.kind === "people");
    return free.splice(i >= 0 ? i : 0, 1)[0];
  };
  const pages = project.pages.map((page) => {
    const slots = [...slotsOf(page, project.format)].sort((a, b) => b.w * b.h - a.w * a.h);
    const fills = { ...page.fills };
    let changed = false;
    for (const s of slots) {
      if (fills[s.id]) continue;
      const p = take(s.role);
      if (!p) break;
      fills[s.id] = fillFor(p);
      changed = true;
    }
    return changed ? { ...page, fills } : page;
  });
  return { ...project, pages };
}

// Frames used one after another while building a carousel: one photo, then two.
const SINGLES = ["lalpar", "velvet", "shola", "galicha", "raat"];
const DOUBLES = ["padma", "golapi", "maroon"];
const MAX_PAGES = 10;

// The carousel the site makes on its own: a cover, then the photos in time
// order across a mix of frames, and a grid of the best nine at the end.
export function buildProject(chosen: Photo[], format: Format, cover: { title: string; subtitle: string }): Project {
  if (!chosen.length) return { format, pages: [makePage("arch", format)] };
  const first = makePage("arch", format, [chosen[0]]);
  first.texts = first.texts.map((t, i) => (i === 0 ? { ...t, text: cover.title } : i === 1 ? { ...t, text: cover.subtitle } : t));
  const pages: Page[] = [first];
  const rest = chosen.slice(1);
  // With plenty of photos, a panorama right after the cover: the swipe people remember.
  if (rest.length >= 9) pages.push(makePage("padma-pano", format, rest.splice(0, 4)));
  const wantGrid = chosen.length >= 6;
  const room = MAX_PAGES - 1 - (wantGrid ? 1 : 0);
  let singles = 0;
  let doubles = 0;
  while (rest.length && pages.length <= room) {
    const double = DOUBLES.length > 0 && rest.length >= 2 && pages.length % 2 === 0;
    if (double) pages.push(makePage(DOUBLES[doubles++ % DOUBLES.length], format, rest.splice(0, 2)));
    else pages.push(makePage(SINGLES[singles++ % SINGLES.length], format, rest.splice(0, 1)));
  }
  if (wantGrid) {
    const best = [...chosen].sort((a, b) => b.score - a.score).slice(0, 9);
    const ordered = [...best.slice(1, 5), best[0], ...best.slice(5)];
    pages.push(makePage("sara9", format, ordered));
  }
  return { format, pages };
}

// ---------- undo / redo ----------

export type History = { past: Project[]; present: Project; future: Project[] };
export type HistoryAction = { type: "set"; project: Project } | { type: "undo" } | { type: "redo" };

export function historyReducer(h: History, a: HistoryAction): History {
  switch (a.type) {
    case "set":
      if (a.project === h.present) return h;
      return { past: [...h.past.slice(-60), h.present], present: a.project, future: [] };
    case "undo":
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    case "redo":
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
  }
}

export const updatePage = (project: Project, pageId: string, fn: (p: Page) => Page): Project => ({
  ...project,
  pages: project.pages.map((p) => (p.id === pageId ? fn(p) : p)),
});
