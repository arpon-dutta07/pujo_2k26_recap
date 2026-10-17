// Finger and mouse handling for the studio pages: drag, two-finger pinch and
// turn, the corner handle, and taps. Works out the new values; the studio
// decides what to do with them.
import { MAX_ZOOM, place, unrotate } from "./geometry";
import type { Fill, SlotDef, StickerItem, TextItem } from "./types";

export type Pt = { x: number; y: number };

export type Target =
  | { kind: "slot"; id: string; slot: SlotDef; aspect: number; value: Fill }
  | { kind: "sticker"; id: string; value: StickerItem }
  | { kind: "text"; id: string; value: TextItem }
  | { kind: "rotate"; id: string; of: "sticker" | "text"; value: StickerItem | TextItem; anchor: Pt };

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);
const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toDeg = (r: number) => (r * 180) / Math.PI;

const SIZE_LIMIT = { sticker: [40, 3200], text: [14, 640] } as const;

// `start` = pointer positions when the gesture (re)started, `now` = current.
// `scale` = screen px per export px.
export function transform(t: Target, start: Pt[], now: Pt[], scale: number): Fill | StickerItem | TextItem {
  const pinch = start.length >= 2 && now.length >= 2;
  const s = pinch ? dist(now[0], now[1]) / Math.max(1, dist(start[0], start[1])) : 1;
  const turn = pinch ? angle(now[0], now[1]) - angle(start[0], start[1]) : 0;
  const a = pinch ? mid(start[0], start[1]) : start[0];
  const b = pinch ? mid(now[0], now[1]) : now[0];
  const dx = (b.x - a.x) / scale;
  const dy = (b.y - a.y) / scale;

  if (t.kind === "slot") {
    const { slot, aspect, value } = t;
    const zoom = clamp(value.zoom * s, 1, MAX_ZOOM);
    const p0 = place(slot.w, slot.h, aspect, { ...value, zoom });
    const d = unrotate(dx, dy, slot.rotate);
    const p1 = place(slot.w, slot.h, aspect, { zoom, cx: p0.cx - d.dx / p0.w, cy: p0.cy - d.dy / p0.h });
    return { ...value, zoom, cx: p1.cx, cy: p1.cy };
  }

  if (t.kind === "rotate") {
    const v0 = { x: start[0].x - t.anchor.x, y: start[0].y - t.anchor.y };
    const v1 = { x: now[0].x - t.anchor.x, y: now[0].y - t.anchor.y };
    const k = Math.hypot(v1.x, v1.y) / Math.max(1, Math.hypot(v0.x, v0.y));
    const r = Math.atan2(v1.y, v1.x) - Math.atan2(v0.y, v0.x);
    const [lo, hi] = SIZE_LIMIT[t.of];
    return { ...t.value, size: clamp(t.value.size * k, lo, hi), rotate: snapAngle(t.value.rotate + toDeg(r)) };
  }

  const [lo, hi] = SIZE_LIMIT[t.kind];
  return {
    ...t.value,
    x: t.value.x + dx,
    y: t.value.y + dy,
    size: clamp(t.value.size * s, lo, hi),
    rotate: pinch ? snapAngle(t.value.rotate + toDeg(turn)) : t.value.rotate,
  };
}

// Straight is easy to hit: within 4 degrees of a right angle, snap to it.
function snapAngle(d: number) {
  const n = ((d % 360) + 540) % 360 - 180;
  const nearest = Math.round(n / 90) * 90;
  return Math.abs(n - nearest) < 4 ? nearest : n;
}
