// Turns pages into pixels: the cached template layers shown behind the live
// editor, template thumbnails, and the full-size JPEGs that get shared.
import { bnDate, bnTime } from "../lib/bn";
import { dayLabel } from "../lib/days";
import { canvasToJpegAsync } from "../lib/image";
import { ensureFonts, FONT } from "../lib/render/draw";
import type { ExportFile } from "../lib/share";
import type { Photo } from "../lib/types";
import { byZ, deg, place, roundRect, slotPath } from "./geometry";
import { midUrlOf } from "./photos";
import { drawSticker, getStickerImage, stickerById } from "./stickers";
import { templateById } from "./templates";
import { FORMATS, type FontKey, type Format, type Page, type Project, type TemplateDef, type TextItem } from "./types";

export const FONTS: Record<FontKey, { family: string; weight: number; label: string }> = {
  display: { family: FONT.display, weight: 400, label: "গালাডা" },
  serif: { family: FONT.serif, weight: 400, label: "তিরো" },
  body: { family: FONT.body, weight: 600, label: "হিন্দ" },
};

export const fontCss = (k: FontKey, px: number) => `${FONTS[k].weight} ${px}px "${FONTS[k].family}"`;

export const LINE_HEIGHT = 1.3;

export function pageSize(format: Format, def: TemplateDef) {
  const f = FORMATS[format];
  const span = def.span ?? 1;
  return { W: f.w * span, H: f.h, span, slideW: f.w };
}

// Words bound to a slot follow whichever photo sits there.
export function textOf(item: TextItem, page: Page, photo: (id: string) => Photo | undefined): string {
  if (!item.bind) return item.text;
  const fill = page.fills[item.bind.slot];
  const p = fill ? photo(fill.photoId) : undefined;
  if (!p) return item.bind.field === "day" ? item.text : "";
  if (item.bind.field === "day") return dayLabel(p.day) ?? item.text;
  if (!p.fromExif || !p.takenAt) return "";
  return item.bind.field === "time" ? bnTime(p.takenAt) : bnDate(p.takenAt);
}

// Light text on dark pills and the other way round.
export function contrastInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff6e6";
  const v = parseInt(m[1], 16);
  const lum = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return lum > 0.6 ? "#2a0c05" : "#fff6e6";
}

export const PAPER = "#fbf1dc";

export function drawText(ctx: CanvasRenderingContext2D, item: TextItem, content: string) {
  if (!content.trim()) return;
  const lines = content.split("\n");
  const lh = item.size * LINE_HEIGHT;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(deg(item.rotate));
  ctx.font = fontCss(item.font, item.size);
  ctx.textBaseline = "middle";
  ctx.textAlign = item.align;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const tw = Math.max(...widths);
  const padX = item.style === "paper" || item.style === "pill" ? item.size * 0.5 : 0;
  const padY = item.style === "paper" || item.style === "pill" ? item.size * 0.25 : 0;
  const boxW = tw + padX * 2;
  const boxH = lines.length * lh + padY * 2;
  const left = item.align === "left" ? 0 : item.align === "right" ? -boxW : -boxW / 2;
  const textX = item.align === "left" ? padX : item.align === "right" ? -padX : 0;
  let ink = item.color;
  if (item.style === "paper" || item.style === "pill") {
    ctx.save();
    ctx.shadowColor = "rgba(30,10,5,0.3)";
    ctx.shadowBlur = item.size * 0.35;
    ctx.shadowOffsetY = item.size * 0.08;
    ctx.beginPath();
    roundRect(ctx, left, -boxH / 2, boxW, boxH, item.style === "pill" ? boxH / 2 : item.size * 0.12);
    ctx.fillStyle = item.style === "pill" ? item.color : PAPER;
    ctx.fill();
    ctx.restore();
    if (item.style === "pill") ink = contrastInk(item.color);
  }
  if (item.style === "shadow") {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = item.size * 0.3;
    ctx.shadowOffsetY = item.size * 0.06;
  }
  ctx.fillStyle = ink;
  lines.forEach((l, i) => ctx.fillText(l, textX, (i - (lines.length - 1) / 2) * lh));
  ctx.restore();
}

// ---------- template layers (cached) ----------

// Image templates: the template picture with its photo windows cut out
// (transparent). Photos go underneath it.
export type Layers = { bg: string | null; over: string | null };

export const overlayUrl = (templateId: string, format: Format) => {
  const def = templateById(templateId);
  return def.overlaySrc?.[format] || def.src || `/templates/${templateId}__${format}.webp`;
};

export async function templateLayers(templateId: string, format: Format): Promise<Layers> {
  return { bg: null, over: overlayUrl(templateId, format) };
}

// Small preview with plain paper windows (made by the template script).
export function templateThumb(templateId: string, format: Format): Promise<string> {
  return Promise.resolve(templateById(templateId).thumbSrc?.[format] ?? overlayUrl(templateId, format));
}

// ---------- full-size export ----------

type Source = { image: CanvasImageSource; close: () => void };

// Wider than this is never needed for a 1080 px page and costs a phone too much memory.
const MAX_DECODE = 2400;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image did not load"));
    img.src = url;
  });
}

// The photo at about the width it is drawn, trying the gentlest way first.
// Phones can run out of memory on a full-size camera photo, older Safari
// ignores the resize options, and a picked file can become unreadable later;
// the last resorts are the sharper preview copy and the thumbnail, so the
// page still comes out.
async function loadPhoto(photo: Photo, width: number): Promise<Source | null> {
  const w = Math.max(64, Math.min(MAX_DECODE, Math.ceil(width)));
  try {
    const bmp = await createImageBitmap(photo.file, { resizeWidth: w, resizeQuality: "high" });
    return { image: bmp, close: () => bmp.close() };
  } catch {
    // try the next way
  }
  const url = URL.createObjectURL(photo.file);
  try {
    const img = await loadImage(url);
    return { image: img, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
  }
  for (const u of [midUrlOf(photo.id), photo.thumbUrl]) {
    if (!u) continue;
    try {
      return { image: await loadImage(u), close: () => undefined };
    } catch {
      // try the next way
    }
  }
  return null;
}

// The moodboard picture that goes over the photos.
async function loadOverlay(url: string): Promise<Source> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bmp = await createImageBitmap(await res.blob());
    return { image: bmp, close: () => bmp.close() };
  } catch {
    const img = await loadImage(url).catch(() => {
      throw new Error("frame did not load (check the connection)");
    });
    return { image: img, close: () => undefined };
  }
}

// Fonts that do not arrive in time fall back to the system ones rather than block the export.
const fontsOrTimeout = () => Promise.race([ensureFonts().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);

// Hands out each photo decoded once, so a photo used on several pages is not
// decoded again for every one of them.
export type PhotoLoader = (photo: Photo, width: number) => Promise<Source | null>;

export async function renderPage(
  page: Page,
  format: Format,
  photo: (id: string) => Photo | undefined,
  load: PhotoLoader = loadPhoto,
): Promise<HTMLCanvasElement> {
  await fontsOrTimeout();
  const def = templateById(page.template);
  const { W, H } = pageSize(format, def);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas (close other apps and try again)");
  ctx.imageSmoothingQuality = "high";
  // Empty windows come out as plain photo paper, like in the editor.
  ctx.fillStyle = "#e9e0cd";
  ctx.fillRect(0, 0, W, H);
  const layout = def.layout(W, H);
  for (const s of byZ(layout.slots)) {
    const f = page.fills[s.id];
    const p = f ? photo(f.photoId) : undefined;
    if (!f || !p) continue;
    const pl = place(s.w, s.h, p.width / p.height, f);
    const src = await load(p, pl.w);
    if (!src) continue;
    try {
      ctx.save();
      if (s.clip?.length) {
        // Only inside this window's own outline.
        ctx.beginPath();
        s.clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
      }
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.rotate(deg(s.rotate ?? 0));
      ctx.translate(-s.w / 2, -s.h / 2);
      ctx.beginPath();
      slotPath(ctx, s, 0, 0);
      ctx.clip();
      ctx.drawImage(src.image, pl.x, pl.y, pl.w, pl.h);
    } finally {
      ctx.restore();
      if (load === loadPhoto) src.close();
    }
  }

  // The moodboard itself goes over the photos.
  const over = await loadOverlay(overlayUrl(def.id, format));
  ctx.drawImage(over.image, 0, 0, W, H);
  over.close();

  // Wait for every sticker picture, or a fresh export would leave them out.
  await Promise.all(
    page.stickers.map((st) => {
      const d = stickerById(st.kind);
      return d ? getStickerImage(d.src).catch(() => null) : null;
    }),
  );
  for (const st of page.stickers) {
    drawSticker(ctx, st);
  }
  for (const t of page.texts) drawText(ctx, t, textOf(t, page, photo));
  return c;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export type ExportResult = { files: ExportFile[]; failed: Array<{ page: number; reason: string }> };

// Every page, cut into Instagram slides, one after another so a phone only
// ever holds one full-size page. A page that fails is reported and skipped;
// the rest still come out. Yields between pages so the progress bar moves.
export async function exportProject(
  project: Project,
  photo: (id: string) => Photo | undefined,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const files: ExportFile[] = [];
  const failed: ExportResult["failed"] = [];
  const total = project.pages.length;
  const prefix = project.format === "story" ? "pujo-story" : "pujo-2026";

  // Where each photo is used: the widest it is drawn and the last page it is on.
  const uses = new Map<string, { width: number; last: number }>();
  project.pages.forEach((pg, i) => {
    const def = templateById(pg.template);
    const { W, H } = pageSize(project.format, def);
    for (const s of def.layout(W, H).slots) {
      const f = pg.fills[s.id];
      const p = f ? photo(f.photoId) : undefined;
      if (!f || !p) continue;
      const w = place(s.w, s.h, p.width / p.height, f).w;
      const u = uses.get(p.id);
      uses.set(p.id, { width: Math.max(w, u?.width ?? 0), last: i });
    }
  });
  const decoded = new Map<string, Promise<Source | null>>();
  const load: PhotoLoader = (p) => {
    let d = decoded.get(p.id);
    if (!d) decoded.set(p.id, (d = loadPhoto(p, uses.get(p.id)?.width ?? 1080)));
    return d;
  };
  const release = async (id: string) => {
    const d = decoded.get(id);
    decoded.delete(id);
    (await d)?.close();
  };

  let n = 0;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    onProgress(i, total);
    await new Promise((r) => setTimeout(r, 0));
    const page = project.pages[i];
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await renderPage(page, project.format, photo, load);
      const def = templateById(page.template);
      const { slideW, span, H } = pageSize(project.format, def);
      if (span === 1) {
        files.push({ name: `${prefix}-${pad2(++n)}.jpg`, blob: await canvasToJpegAsync(canvas, 0.92) });
      } else {
        const slice = document.createElement("canvas");
        slice.width = slideW;
        slice.height = H;
        const sctx = slice.getContext("2d")!;
        for (let k = 0; k < span; k++) {
          sctx.clearRect(0, 0, slideW, H);
          sctx.drawImage(canvas, k * slideW, 0, slideW, H, 0, 0, slideW, H);
          files.push({ name: `${prefix}-${pad2(++n)}.jpg`, blob: await canvasToJpegAsync(slice, 0.92) });
        }
        slice.width = slice.height = 1;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") throw err;
      console.error(`page ${i + 1}`, err);
      failed.push({ page: i + 1, reason: (err as Error)?.message || String(err) });
    } finally {
      // Phones keep only so much memory: give back this page's canvas and
      // every photo no later page needs.
      if (canvas) canvas.width = canvas.height = 1;
      for (const [id, u] of uses) if (u.last <= i && decoded.has(id)) await release(id);
    }
  }
  for (const id of [...decoded.keys()]) await release(id);
  onProgress(total, total);
  return { files, failed };
}
