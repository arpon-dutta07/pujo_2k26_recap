// Photo placement inside a slot and the slot outlines. The same numbers drive
// the on-screen preview (CSS percentages) and the exported JPEG (canvas), so
// what people see while editing is what they get.
import type { Fill, SlotDef } from "./types";

export const MAX_ZOOM = 4;

export type Placement = { x: number; y: number; w: number; h: number; cx: number; cy: number };

// Photo rectangle relative to the slot's top-left corner, clamped so the photo
// always covers the slot. Returns the centre that was actually used.
export function place(slotW: number, slotH: number, aspect: number, fill: Pick<Fill, "zoom" | "cx" | "cy">): Placement {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, fill.zoom));
  const base = Math.max(slotW / aspect, slotH); // photo height that just covers
  const h = base * zoom;
  const w = h * aspect;
  const x = Math.min(0, Math.max(slotW - w, slotW / 2 - fill.cx * w));
  const y = Math.min(0, Math.max(slotH - h, slotH / 2 - fill.cy * h));
  return { x, y, w, h, cx: (slotW / 2 - x) / w, cy: (slotH / 2 - y) / h };
}

// Arch = rectangle with a semicircular top, like a temple doorway.
export function slotPath(ctx: CanvasPath, s: SlotDef, x = s.x, y = s.y) {
  const { w, h } = s;
  if (s.shape === "circle") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (s.shape === "arch") {
    const r = Math.min(w / 2, h);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + w / 2, y + r, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  } else {
    ctx.roundRect(x, y, w, h, s.radius ?? 0);
  }
}

// The same outline as CSS, for the preview.
export function slotRadiusCss(s: SlotDef): string | undefined {
  if (s.shape === "circle") return "50%";
  if (s.shape === "arch") {
    const v = ((s.w / 2 / s.h) * 100).toFixed(3);
    return `50% 50% 0 0 / ${v}% ${v}% 0 0`;
  }
  if (s.radius) return `${((s.radius / s.w) * 100).toFixed(3)}% / ${((s.radius / s.h) * 100).toFixed(3)}%`;
  return undefined;
}

export const deg = (d: number) => (d * Math.PI) / 180;

// The window outline as a CSS clip-path for the slot element, which is
// positioned at (x, y, w, h) and turned by `rotate` around its centre.
export function slotClipCss(s: SlotDef): string | undefined {
  if (!s.clip?.length) return undefined;
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const a = -deg(s.rotate ?? 0);
  const pts = s.clip.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a) + s.w / 2;
    const ly = dx * Math.sin(a) + dy * Math.cos(a) + s.h / 2;
    return `${((lx / s.w) * 100).toFixed(2)}% ${((ly / s.h) * 100).toFixed(2)}%`;
  });
  return `polygon(${pts.join(", ")})`;
}

// Slots in drawing order (lowest z first; ties keep their reading order).
export const byZ = <T extends { z?: number }>(slots: T[]) =>
  slots.map((s, i) => ({ s, i })).sort((a, b) => (a.s.z ?? 0) - (b.s.z ?? 0) || a.i - b.i).map(({ s }) => s);

// Rotates a screen-space drag into a rotated slot's own axes.
export function unrotate(dx: number, dy: number, degrees = 0) {
  if (!degrees) return { dx, dy };
  const a = -deg(degrees);
  return { dx: dx * Math.cos(a) - dy * Math.sin(a), dy: dx * Math.sin(a) + dy * Math.cos(a) };
}
