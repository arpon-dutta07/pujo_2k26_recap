// Draws recap slides on a canvas: the backgrounds behind the animated page,
// and every slide as a 1080x1920 picture to share.
import { getStickerImage, stickerById } from "../editor/stickers";
import { bnNum } from "../lib/bn";
import { alpona, decodeForExport, ensureFonts } from "../lib/render/draw";
import { chipLayout, countText, cropOf, faceRings, fontCss, lines, polaroidParts } from "./measure";
import { SLIDE_H, SLIDE_W, type El, type Motif, type PhotoEl, type Slide } from "./types";

const POLAROID = "#fffdf6";
const CAPTION = "#8a1d17";
const RING = "#ffb52e";

const deg = (d: number) => (d * Math.PI) / 180;

// ---------- backgrounds ----------

// Patterns cover the whole slide: dots, or a saree border top and bottom.
export function paintPattern(ctx: CanvasRenderingContext2D, slide: Slide, k = 1) {
  if (slide.pattern === "dots") {
    ctx.save();
    ctx.fillStyle = slide.patternColor;
    ctx.globalAlpha = 0.12;
    for (let y = 40; y < SLIDE_H; y += 56)
      for (let x = (y / 56) % 2 ? 40 : 68; x < SLIDE_W; x += 56) {
        ctx.beginPath();
        ctx.arc(x * k, y * k, 3.2 * k, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
  } else if (slide.pattern === "border") {
    ctx.save();
    const band = 34 * k;
    const tooth = 22 * k;
    const step = 36 * k;
    ctx.fillStyle = slide.patternColor;
    for (const top of [true, false]) {
      const y0 = top ? 0 : SLIDE_H * k - band;
      ctx.fillRect(0, y0, SLIDE_W * k, band);
      ctx.beginPath();
      for (let x = 0; x < SLIDE_W * k; x += step) {
        const edge = top ? band : SLIDE_H * k - band;
        const tip = top ? band + tooth : SLIDE_H * k - band - tooth;
        ctx.moveTo(x, edge);
        ctx.lineTo(x + step / 2, tip);
        ctx.lineTo(x + step, edge);
      }
      ctx.fill();
    }
    ctx.restore();
  }
}

// The big ornament (alpona, rays, rings or a moon) centred at (cx, cy).
export function paintMotif(ctx: CanvasRenderingContext2D, motif: Motif, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  if (motif === "alpona") {
    ctx.globalAlpha = 0.16;
    alpona(ctx, cx, cy, r, color, 12);
    alpona(ctx, cx, cy, r * 0.6, color, 8);
  } else if (motif === "rays") {
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = color;
    const n = 28;
    for (let i = 0; i < n; i += 2) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (motif === "rings") {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.006);
    for (const f of [0.32, 0.52, 0.72, 0.92]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([2, r * 0.035]);
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(4, r * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  } else if (motif === "moon") {
    // A crescent with a soft glow, cut on its own layer.
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(r * 3);
    const m = c.getContext("2d")!;
    const o = c.width / 2;
    m.shadowColor = color;
    m.shadowBlur = r * 0.5;
    m.fillStyle = color;
    m.beginPath();
    m.arc(o, o, r, 0, Math.PI * 2);
    m.fill();
    m.shadowColor = "transparent";
    m.globalCompositeOperation = "destination-out";
    m.beginPath();
    m.arc(o + r * 0.42, o - r * 0.28, r * 0.88, 0, Math.PI * 2);
    m.fill();
    ctx.drawImage(c, cx - o, cy - o);
  }
  ctx.restore();
}

// ---------- elements ----------

export type Picture = ImageBitmap | HTMLImageElement;

export const releasePictures = (cache: Map<string, Picture>) => {
  cache.forEach((p) => "close" in p && p.close());
  cache.clear();
};

async function photoBitmap(el: PhotoEl, cache: Map<string, Picture>) {
  const hit = cache.get(el.photo.id);
  if (hit) return hit;
  const bmp = await decodeForExport(el.photo);
  cache.set(el.photo.id, bmp);
  return bmp;
}

function textBlock(
  ctx: CanvasRenderingContext2D,
  el: { x: number; y: number; w: number; size: number; font: "display" | "serif" | "body"; weight?: number; color: string; align?: "left" | "center" | "right"; lh?: number; rotate?: number },
  text: string,
) {
  const weight = el.weight ?? 400;
  const ls = lines(text, el.font, el.size, weight, el.w);
  const L = el.size * (el.lh ?? 1.25);
  const align = el.align ?? "center";
  ctx.save();
  if (el.rotate) {
    ctx.translate(el.x + el.w / 2, el.y + (ls.length * L) / 2);
    ctx.rotate(deg(el.rotate));
    ctx.translate(-(el.x + el.w / 2), -(el.y + (ls.length * L) / 2));
  }
  ctx.font = fontCss(el.font, el.size, weight);
  ctx.fillStyle = el.color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const ax = align === "left" ? el.x : align === "right" ? el.x + el.w : el.x + el.w / 2;
  ls.forEach((l, i) => ctx.fillText(l, ax, el.y + L * (i + 0.5)));
  ctx.restore();
}

async function paintEl(ctx: CanvasRenderingContext2D, el: El, cache: Map<string, Picture>) {
  switch (el.k) {
    case "text":
      return textBlock(ctx, el, el.text);
    case "count":
      return textBlock(ctx, el, countText(el, el.value));
    case "box": {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(el.x, el.y, el.w, el.h, el.radius);
      ctx.fillStyle = el.fill;
      ctx.fill();
      if (el.stroke) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    case "chips": {
      ctx.save();
      for (const c of chipLayout(el)) {
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.w, c.h, c.h / 2);
        ctx.fillStyle = el.bg;
        ctx.fill();
        ctx.font = fontCss("body", el.size, 600);
        ctx.fillStyle = el.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.text, c.x + c.w / 2, c.y + c.h / 2);
      }
      ctx.restore();
      return;
    }
    case "sticker": {
      const def = stickerById(el.sticker);
      if (!def) return;
      const img = await getStickerImage(def.src).catch(() => null);
      if (!img) return;
      const h = el.w * (def.h / def.w);
      ctx.save();
      ctx.translate(el.x + el.w / 2, el.y + h / 2);
      ctx.rotate(deg(el.rotate ?? 0));
      ctx.shadowColor = "rgba(20, 5, 10, 0.3)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(img, -el.w / 2, -h / 2, el.w, h);
      ctx.restore();
      return;
    }
    case "photo": {
      const bmp = await photoBitmap(el, cache);
      const { img, bottom } = polaroidParts(el);
      ctx.save();
      ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
      ctx.rotate(deg(el.rotate ?? 0));
      ctx.translate(-el.w / 2, -el.h / 2);
      ctx.shadowColor = "rgba(15, 4, 10, 0.4)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      ctx.beginPath();
      ctx.roundRect(0, 0, el.w, el.h, el.frame === "plain" ? 18 : 8);
      ctx.fillStyle = POLAROID;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(img.x, img.y, img.w, img.h, el.frame === "plain" ? 18 : 3);
      ctx.clip();
      const crop = cropOf(el.photo, bmp.width, bmp.height, img.w, img.h);
      if (el.blur) ctx.filter = "blur(9px)";
      ctx.drawImage(bmp, crop.sx, crop.sy, crop.sw, crop.sh, img.x, img.y, img.w, img.h);
      ctx.filter = "none";
      if (el.faces) {
        ctx.strokeStyle = RING;
        ctx.lineWidth = Math.max(4, el.w * 0.008);
        for (const f of faceRings(el.photo, bmp.width, bmp.height, img.w, img.h)) {
          ctx.beginPath();
          ctx.arc(img.x + f.cx, img.y + f.cy, f.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      if (el.caption) {
        ctx.font = fontCss("display", el.w * 0.075);
        ctx.fillStyle = CAPTION;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.caption, el.w / 2, el.h - bottom / 2);
      }
      if (el.stamp) {
        const size = el.w * 0.085;
        ctx.save();
        ctx.translate(el.w / 2, img.y + img.h * 0.55);
        ctx.rotate(deg(-12));
        ctx.font = fontCss("body", size, 700);
        const tw = ctx.measureText(el.stamp).width + size * 1.1;
        const th = size * 1.7;
        ctx.beginPath();
        ctx.roundRect(-tw / 2, -th / 2, tw, th, size * 0.3);
        ctx.fillStyle = "rgba(255, 247, 234, 0.94)";
        ctx.fill();
        ctx.lineWidth = size * 0.16;
        ctx.strokeStyle = "#c8151d";
        ctx.stroke();
        ctx.fillStyle = "#c8151d";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.stamp, 0, 0);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    case "bars": {
      const n = el.items.length;
      const max = Math.max(1, ...el.items.map((i) => i.value));
      const col = el.w / n;
      const barW = Math.min(110, col * 0.58);
      const labelH = 70;
      const valueH = 60;
      const room = el.h - labelH - valueH;
      ctx.save();
      el.items.forEach((it, i) => {
        const bh = Math.max(14, (it.value / max) * room);
        const cx = el.x + col * (i + 0.5);
        const top = el.y + valueH + room - bh;
        ctx.beginPath();
        ctx.roundRect(cx - barW / 2, top, barW, bh, [barW / 2, barW / 2, 8, 8]);
        ctx.fillStyle = it.hot ? el.hot : el.color;
        ctx.fill();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = el.ink;
        ctx.font = fontCss("serif", 40);
        ctx.fillText(bnNum(it.value), cx, top - 30);
        ctx.font = fontCss("body", 32, 600);
        ctx.fillText(it.label, cx, el.y + el.h - labelH / 2);
      });
      ctx.restore();
      return;
    }
    case "route": {
      const pts = el.points.map(([px, py]) => [el.x + px * el.w, el.y + py * el.h] as const);
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.fillStyle = el.dot;
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [x, y] of [pts[0], pts[pts.length - 1]]) {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = el.color;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = el.dot;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
  }
}

// One slide as the picture people share.
export async function paintSlide(slide: Slide, cache = new Map<string, Picture>()): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const c = document.createElement("canvas");
  c.width = SLIDE_W;
  c.height = SLIDE_H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = slide.bg;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  paintPattern(ctx, slide);
  if (slide.motif !== "none") paintMotif(ctx, slide.motif, slide.motifAt[0], slide.motifAt[1], slide.motifR, slide.motifColor);
  for (const el of slide.els) await paintEl(ctx, el, cache);
  return c;
}

export function slideToJpeg(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9));
}
