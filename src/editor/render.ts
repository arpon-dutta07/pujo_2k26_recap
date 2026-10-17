// Turns pages into pixels: the cached template layers shown behind the live
// editor, template thumbnails, and the full-size JPEGs that get shared.
import { SITE } from "../config";
import { bnDate, bnTime } from "../lib/bn";
import { dayLabel } from "../lib/days";
import { canvasToJpeg } from "../lib/image";
import { ensureFonts, FONT } from "../lib/render/draw";
import type { ExportFile } from "../lib/share";
import type { Photo } from "../lib/types";
import { deg, place, slotPath } from "./geometry";
import { drawSticker, stickerById } from "./stickers";
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

const toBlobUrl = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<string>((resolve) => {
    c.toBlob(
      (b) => resolve(b ? URL.createObjectURL(b) : c.toDataURL(type, q)),
      type,
      q,
    );
  });

export type Layers = { bg: string; over: string | null };
const layerCache = new Map<string, Promise<Layers>>();

export function templateLayers(templateId: string, format: Format): Promise<Layers> {
  const key = `${templateId}:${format}`;
  let hit = layerCache.get(key);
  if (!hit) {
    hit = (async () => {
      await ensureFonts();
      const def = templateById(templateId);
      const { W, H } = pageSize(format, def);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      def.paint(ctx, W, H);
      const bg = await toBlobUrl(c, "image/jpeg", 0.9);
      let over: string | null = null;
      if (def.over) {
        ctx.clearRect(0, 0, W, H);
        def.over(ctx, W, H);
        over = await toBlobUrl(c, "image/png");
      }
      c.width = c.height = 1;
      return { bg, over };
    })();
    layerCache.set(key, hit);
  }
  return hit;
}

// Small preview of a template with placeholder photos, for pickers and the landing page.
const thumbCache = new Map<string, Promise<string>>();

function placeholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, i: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  const hues = [
    ["#e9b98a", "#b4562f"],
    ["#d9a0a4", "#7c2735"],
    ["#e8c77b", "#a2622a"],
    ["#c9a98a", "#5d3b2a"],
  ][i % 4];
  g.addColorStop(0, hues[0]);
  g.addColorStop(1, hues[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // a person-shaped silhouette so it reads as "your photo here"
  const cx = x + w / 2;
  const s = Math.min(w, h);
  ctx.fillStyle = "rgba(255,240,220,0.35)";
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.5 - s * 0.12, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.5 + s * 0.24, s * 0.26, s * 0.2, 0, Math.PI, 0);
  ctx.fill();
}

export function templateThumb(templateId: string, format: Format, width = 360): Promise<string> {
  const key = `${templateId}:${format}:${width}`;
  let hit = thumbCache.get(key);
  if (!hit) {
    hit = (async () => {
      await ensureFonts();
      const def = templateById(templateId);
      const { W, H } = pageSize(format, def);
      const k = (width * (def.span ?? 1)) / W;
      const c = document.createElement("canvas");
      c.width = Math.round(W * k);
      c.height = Math.round(H * k);
      const ctx = c.getContext("2d")!;
      ctx.scale(k, k);
      def.paint(ctx, W, H);
      const layout = def.layout(W, H);
      layout.slots.forEach((s, i) => {
        ctx.save();
        ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
        ctx.rotate(deg(s.rotate ?? 0));
        ctx.beginPath();
        slotPath(ctx, s, -s.w / 2, -s.h / 2);
        ctx.clip();
        placeholder(ctx, -s.w / 2, -s.h / 2, s.w, s.h, i);
        ctx.restore();
      });
      def.over?.(ctx, W, H);
      for (const st of layout.stickers ?? []) {
        const sd = stickerById(st.kind);
        if (!sd) continue;
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(deg(st.rotate ?? 0));
        drawSticker(ctx, sd, st.size);
        ctx.restore();
      }
      for (const t of layout.texts ?? []) {
        if (t.bind && t.bind.field !== "day") continue;
        drawText(ctx, { id: "", rotate: 0, align: "center", style: "plain", ...t }, t.text);
      }
      return toBlobUrl(c, "image/jpeg", 0.86);
    })();
    thumbCache.set(key, hit);
  }
  return hit;
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

export function drawLink(ctx: CanvasRenderingContext2D, x: number, H: number) {
  ctx.save();
  ctx.font = `500 24px "${FONT.body}"`;
  const w = ctx.measureText(SITE.link).width + 32;
  ctx.fillStyle = "rgba(20,8,5,0.42)";
  ctx.beginPath();
  ctx.roundRect(x - w / 2, H - 58, w, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#fff3dc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(SITE.link, x, H - 40);
  ctx.restore();
}

export async function renderPage(
  page: Page,
  format: Format,
  photo: (id: string) => Photo | undefined,
  marks: { first: boolean; last: boolean },
): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const def = templateById(page.template);
  const { W, H, slideW } = pageSize(format, def);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  def.paint(ctx, W, H);
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
  def.over?.(ctx, W, H);
  for (const st of page.stickers) {
    const sd = stickerById(st.kind);
    if (!sd) continue;
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(deg(st.rotate));
    if (st.flip) ctx.scale(-1, 1);
    drawSticker(ctx, sd, st.size);
    ctx.restore();
  }
  for (const t of page.texts) drawText(ctx, t, textOf(t, page, photo));
  if (marks.first) drawLink(ctx, slideW / 2, H);
  if (marks.last) drawLink(ctx, W - slideW / 2, H);
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
    const canvas = await renderPage(page, project.format, photo, { first: i === 0, last: i === total - 1 });
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
