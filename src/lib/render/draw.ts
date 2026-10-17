// Shared canvas drawing: fonts, themes, crops, alpona ornaments, text wrapping.
import { canvasToJpeg } from "../image";
import type { Photo } from "../types";

export const FONT = {
  display: "Galada",
  body: "Hind Siliguri",
  serif: "Tiro Bangla",
};

let fontsReady: Promise<void> | null = null;
export function ensureFonts(): Promise<void> {
  fontsReady ??= Promise.all([
    document.fonts.load(`80px "${FONT.display}"`, "পুজো"),
    document.fonts.load(`400 40px "${FONT.body}"`, "পুজো"),
    document.fonts.load(`600 40px "${FONT.body}"`, "পুজো"),
    document.fonts.load(`700 40px "${FONT.body}"`, "পুজো"),
    document.fonts.load(`40px "${FONT.serif}"`, "পুজো ১২৩"),
  ]).then(() => undefined);
  return fontsReady;
}

export type ThemeId = "lalpar" | "raat";

export type Theme = {
  id: ThemeId;
  name: string;
  paper: string;
  border: string;
  line: string;
  accent: string;
  text: string;
  sub: string;
  grain: string;
};

export const THEMES: Record<ThemeId, Theme> = {
  lalpar: {
    id: "lalpar",
    name: "লাল পাড় সাদা",
    paper: "#f5ecda",
    border: "#a3131b",
    line: "#d6a542",
    accent: "#a3131b",
    text: "#2b140f",
    sub: "#7b5646",
    grain: "rgba(120, 80, 40, 0.05)",
  },
  raat: {
    id: "raat",
    name: "প্যান্ডেলের রাত",
    paper: "#170b07",
    border: "#3a160c",
    line: "#e0b45a",
    accent: "#f2c46d",
    text: "#fbeedb",
    sub: "#c7a789",
    grain: "rgba(255, 200, 120, 0.035)",
  },
};

// Deterministic PRNG so every export of the same photo looks identical.
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function paperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, seed = 7) {
  const rnd = seeded(seed);
  ctx.fillStyle = color;
  const n = Math.floor((w * h) / 900);
  for (let i = 0; i < n; i++) ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
}

// Where to centre a crop: on the faces if we found any, otherwise slightly above centre.
export function focusOf(photo: Photo): { x: number; y: number } {
  const boxes = photo.faces?.boxes ?? [];
  if (!boxes.length) return { x: 0.5, y: 0.45 };
  let x = 0;
  let y = 0;
  let wsum = 0;
  for (const b of boxes) {
    const weight = b.w * b.h;
    x += (b.x + b.w / 2) * weight;
    y += (b.y + b.h / 2) * weight;
    wsum += weight;
  }
  return { x: x / wsum, y: y / wsum };
}

export function coverRect(sw: number, sh: number, dw: number, dh: number, focus = { x: 0.5, y: 0.5 }) {
  const scale = Math.max(dw / sw, dh / sh);
  const cw = dw / scale;
  const ch = dh / scale;
  const cx = Math.min(Math.max(focus.x * sw - cw / 2, 0), sw - cw);
  const cy = Math.min(Math.max(focus.y * sh - ch / 2, 0), sh - ch);
  return { sx: cx, sy: cy, sw: cw, sh: ch };
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// An alpona rosette: lotus petals, a dotted ring and a seed in the middle.
export function alpona(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, petals = 8) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, r * 0.035);
  ctx.lineCap = "round";
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i / petals) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.22);
    ctx.bezierCurveTo(r * 0.2, -r * 0.42, r * 0.14, -r * 0.7, 0, -r * 0.8);
    ctx.bezierCurveTo(-r * 0.14, -r * 0.7, -r * 0.2, -r * 0.42, 0, -r * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.34);
    ctx.lineTo(0, -r * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.94, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A saree "paar": solid band, gold line, and a chain of small diamonds.
export function sareeBorder(ctx: CanvasRenderingContext2D, w: number, h: number, t: Theme, band = 34) {
  ctx.save();
  ctx.fillStyle = t.border;
  ctx.fillRect(0, 0, w, band);
  ctx.fillRect(0, h - band, w, band);
  ctx.fillRect(0, 0, band, h);
  ctx.fillRect(w - band, 0, band, h);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(band + 8, band + 8, w - 2 * (band + 8), h - 2 * (band + 8));
  ctx.fillStyle = t.line;
  const step = 30;
  const d = band * 0.2;
  const diamond = (x: number, y: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d, y);
    ctx.closePath();
    ctx.fill();
  };
  for (let x = band; x < w - band; x += step) {
    diamond(x + step / 2, band / 2);
    diamond(x + step / 2, h - band / 2);
  }
  for (let y = band; y < h - band; y += step) {
    diamond(band / 2, y + step / 2);
    diamond(w - band / 2, y + step / 2);
  }
  ctx.restore();
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const toJpeg = async (c: HTMLCanvasElement, quality: number): Promise<Blob> => canvasToJpeg(c, quality);

export async function decodeForExport(photo: Photo): Promise<ImageBitmap> {
  const landscape = photo.width >= photo.height;
  try {
    return await createImageBitmap(photo.file, { resizeWidth: landscape ? 1900 : 1350, resizeQuality: "high" });
  } catch {
    return createImageBitmap(photo.file);
  }
}
