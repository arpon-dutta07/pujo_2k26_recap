// Shared measurements, so the animated slide and the shared JPEG break lines
// and crop photos in exactly the same places.
import { coverRect, FONT, focusOf } from "../lib/render/draw";
import type { Photo } from "../lib/types";
import type { ChipsEl, CountEl, Font, PhotoEl } from "./types";
import { bnNum } from "../lib/bn";

const FAMILY: Record<Font, string> = { display: FONT.display, serif: FONT.serif, body: FONT.body };

export const fontCss = (font: Font, size: number, weight = 400) => `${weight} ${size}px "${FAMILY[font]}"`;
export const familyOf = (font: Font) => `"${FAMILY[font]}"`;

let measurer: CanvasRenderingContext2D | null = null;
const ctx = () => (measurer ??= document.createElement("canvas").getContext("2d")!);

export function textWidth(text: string, font: Font, size: number, weight = 400): number {
  const c = ctx();
  c.font = fontCss(font, size, weight);
  return c.measureText(text).width;
}

const cache = new Map<string, string[]>();

// Lines for a text box: explicit "\n" breaks first, then word wrap.
export function lines(text: string, font: Font, size: number, weight: number, maxW: number): string[] {
  const key = `${font}|${size}|${weight}|${maxW}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = ctx();
  c.font = fontCss(font, size, weight);
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && c.measureText(next).width > maxW) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  cache.set(key, out);
  return out;
}

export const countText = (el: CountEl, v: number) =>
  `${el.prefix ?? ""}${bnNum(el.decimals ? v.toFixed(el.decimals) : Math.round(v))}${el.suffix ?? ""}`;

// A polaroid: thin white border, a wider strip at the bottom for the caption.
export function polaroidParts(el: Pick<PhotoEl, "w" | "h" | "frame" | "caption">) {
  if (el.frame === "plain") return { pad: 0, bottom: 0, img: { x: 0, y: 0, w: el.w, h: el.h } };
  const pad = el.w * 0.045;
  const bottom = el.caption ? el.w * 0.16 : pad;
  return { pad, bottom, img: { x: pad, y: pad, w: el.w - 2 * pad, h: el.h - pad - bottom } };
}

// The frame height that shows a photo whole at a given frame width.
export function polaroidHeightFor(photo: Photo, w: number, caption: boolean) {
  const pad = w * 0.045;
  const bottom = caption ? w * 0.16 : pad;
  return (w - 2 * pad) * (photo.height / Math.max(1, photo.width)) + pad + bottom;
}

// Which part of the photo fills the window, in the photo's own pixels.
export const cropOf = (photo: Photo, sw: number, sh: number, boxW: number, boxH: number) =>
  coverRect(sw, sh, boxW, boxH, focusOf(photo));

// Faces as circles inside the window (window coordinates).
export function faceRings(photo: Photo, sw: number, sh: number, boxW: number, boxH: number) {
  const crop = cropOf(photo, sw, sh, boxW, boxH);
  const k = boxW / crop.sw;
  return (photo.faces?.boxes ?? [])
    .map((b) => ({
      cx: ((b.x + b.w / 2) * sw - crop.sx) * k,
      cy: ((b.y + b.h / 2) * sh - crop.sy) * k,
      r: (Math.max(b.w * sw, b.h * sh) / 2) * k * 1.25,
    }))
    .filter((f) => f.cx > 0 && f.cy > 0 && f.cx < boxW && f.cy < boxH);
}

// Pills laid out in rows inside the box.
export function chipLayout(el: ChipsEl) {
  const padX = el.size * 0.7;
  const h = el.size * 1.7;
  const gap = el.size * 0.5;
  const sizes = el.items.map((t) => textWidth(t, "body", el.size, 600) + 2 * padX);
  const rows: Array<{ items: Array<{ text: string; w: number }>; w: number }> = [];
  el.items.forEach((text, i) => {
    const w = sizes[i];
    const row = rows[rows.length - 1];
    if (row && row.w + gap + w <= el.w) {
      row.items.push({ text, w });
      row.w += gap + w;
    } else {
      rows.push({ items: [{ text, w }], w });
    }
  });
  return rows.flatMap((row, r) => {
    let x = el.x + (el.align === "left" ? 0 : (el.w - row.w) / 2);
    return row.items.map((it) => {
      const out = { text: it.text, x, y: el.y + r * (h + gap), w: it.w, h };
      x += it.w + gap;
      return out;
    });
  });
}
