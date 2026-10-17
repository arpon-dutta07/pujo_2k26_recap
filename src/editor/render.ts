// Turns pages into pixels: the cached template layers shown behind the live
// editor, template thumbnails, and the full-size JPEGs that get shared.
import { bnDate, bnTime } from "../lib/bn";
import { dayLabel } from "../lib/days";
import { canvasToJpeg } from "../lib/image";
import { ensureFonts, FONT } from "../lib/render/draw";
import type { ExportFile } from "../lib/share";
import type { Photo } from "../lib/types";
import { deg, place, slotPath } from "./geometry";
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
    ctx.roundRect(left, -boxH / 2, boxW, boxH, item.style === "pill" ? boxH / 2 : item.size * 0.12);
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

async function decodeAt(photo: Photo, width: number): Promise<ImageBitmap> {
  const w = Math.max(64, Math.min(4096, Math.ceil(width)));
  try {
    return await createImageBitmap(photo.file, { resizeWidth: w, resizeQuality: "high" });
  } catch {
    return createImageBitmap(photo.file);
  }
}

export async function renderPage(
  page: Page,
  format: Format,
  photo: (id: string) => Photo | undefined,
): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const def = templateById(page.template);
  const { W, H } = pageSize(format, def);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  // Empty windows come out as plain photo paper, like in the editor.
  ctx.fillStyle = "#e9e0cd";
  ctx.fillRect(0, 0, W, H);
  const layout = def.layout(W, H);
  for (const s of layout.slots) {
    const f = page.fills[s.id];
    const p = f ? photo(f.photoId) : undefined;
    if (!f || !p) continue;
    const pl = place(s.w, s.h, p.width / p.height, f);
    const bmp = await decodeAt(p, pl.w);
    ctx.save();
    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.rotate(deg(s.rotate ?? 0));
    ctx.translate(-s.w / 2, -s.h / 2);
    ctx.beginPath();
    slotPath(ctx, s, 0, 0);
    ctx.clip();
    ctx.drawImage(bmp, pl.x, pl.y, pl.w, pl.h);
    ctx.restore();
    bmp.close();
  }

  // Draw template overlay on top of photos per ANTIGRAVITY.md Task A
  const overlayUrl = def.overlaySrc?.[format] || def.src || `/templates/${def.id}__${format}.webp`;
  try {
    const res = await fetch(overlayUrl);
    if (res.ok) {
      const blob = await res.blob();
      const overlayBmp = await createImageBitmap(blob);
      ctx.drawImage(overlayBmp, 0, 0, W, H);
      overlayBmp.close();
    }
  } catch (err) {
    console.warn("Failed to load export overlay:", overlayUrl, err);
  }

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

// Every page, cut into Instagram slides. Yields between pages so the progress
// bar keeps moving.
export async function exportProject(
  project: Project,
  photo: (id: string) => Photo | undefined,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ExportFile[]> {
  const files: ExportFile[] = [];
  const total = project.pages.length;
  const prefix = project.format === "story" ? "pujo-story" : "pujo-2026";
  let n = 0;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    onProgress(i, total);
    await new Promise((r) => setTimeout(r, 0));
    const page = project.pages[i];
    const canvas = await renderPage(page, project.format, photo);
    const def = templateById(page.template);
    const { slideW, span, H } = pageSize(project.format, def);
    if (span === 1) {
      files.push({ name: `${prefix}-${pad2(++n)}.jpg`, blob: canvasToJpeg(canvas, 0.92) });
    } else {
      const slice = document.createElement("canvas");
      slice.width = slideW;
      slice.height = H;
      const sctx = slice.getContext("2d")!;
      for (let k = 0; k < span; k++) {
        sctx.clearRect(0, 0, slideW, H);
        sctx.drawImage(canvas, k * slideW, 0, slideW, H, 0, 0, slideW, H);
        files.push({ name: `${prefix}-${pad2(++n)}.jpg`, blob: canvasToJpeg(slice, 0.92) });
      }
    }
    canvas.width = canvas.height = 1;
  }
  onProgress(total, total);
  return files;
}
