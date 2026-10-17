// Polaroid-style card textures drawn on 2D canvases.
import * as THREE from "three";
import { FONT, alpona, coverRect, ensureFonts, seeded } from "../lib/render/draw";
import heroPhotos from "./hero.generated.json";

export const CARD_W = 256;
export const CARD_H = 300;
const PAD = 14;
const IMG_H = 226;

export type CardSurface = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture };

export function makeSurface(): CardSurface {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx, texture };
}

function frame(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, 6);
  ctx.fill();
}

function caption(ctx: CanvasRenderingContext2D, text: string | null) {
  if (!text) return;
  ctx.fillStyle = "#8a1d17";
  ctx.font = `30px "${FONT.display}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CARD_W / 2, IMG_H + PAD + (CARD_H - IMG_H - PAD) / 2);
}

const WORDS = ["ষষ্ঠী", "সপ্তমী", "অষ্টমী", "নবমী", "দশমী", "ঢাক", "ধুনুচি", "প্যান্ডেল", "অঞ্জলি", "আলো", "শিউলি", "সিঁদুর"];
const HUES = [
  ["#7a0f14", "#e0582c"],
  ["#5a1a4a", "#d9416b"],
  ["#123d3a", "#2e8f7a"],
  ["#3b1d07", "#d49a2a"],
  ["#1f1a4d", "#6a4fcf"],
  ["#4a0b0b", "#f2a33a"],
];

// Real Pujo photos for the landing cards (npm run hero). With none yet,
// the cards fall back to the painted alpona placeholders below.
const HERO = (heroPhotos as { cards: Array<{ src: string; label: string | null }> }).cards;
const heroImages = new Map<string, Promise<HTMLImageElement>>();

// Every paint takes a ticket, so a hero photo that finishes loading late
// never covers a photo painted on the same card in the meantime.
const tickets = new WeakMap<CardSurface, number>();
const take = (s: CardSurface) => {
  const n = (tickets.get(s) ?? 0) + 1;
  tickets.set(s, n);
  return n;
};

// Landing-page cards: a real photo when there is one, otherwise a placeholder.
export async function paintPlaceholder(s: CardSurface, i: number) {
  const ticket = take(s);
  await ensureFonts();
  if (HERO.length) {
    const h = HERO[i % HERO.length];
    if (!heroImages.has(h.src)) heroImages.set(h.src, loadImage(h.src));
    try {
      const img = await heroImages.get(h.src)!;
      if (tickets.get(s) === ticket) drawPhoto(s, img, h.label);
      return;
    } catch {
      // fall through to the painted card
    }
  }
  if (tickets.get(s) !== ticket) return;
  const rnd = seeded(i * 97 + 13);
  const [a, b] = HUES[i % HUES.length];
  const { ctx } = s;
  frame(ctx);
  const g = ctx.createLinearGradient(0, PAD, CARD_W, IMG_H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(PAD, PAD, CARD_W - PAD * 2, IMG_H - PAD);
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, PAD, CARD_W - PAD * 2, IMG_H - PAD);
  ctx.clip();
  ctx.globalAlpha = 0.55;
  alpona(ctx, CARD_W / 2 + (rnd() - 0.5) * 40, IMG_H / 2 + (rnd() - 0.5) * 30, 70 + rnd() * 40, "#ffd98a", 8);
  ctx.globalAlpha = 0.9;
  for (let k = 0; k < 14; k++) {
    ctx.fillStyle = `rgba(255, ${190 + Math.floor(rnd() * 60)}, 120, ${0.25 + rnd() * 0.5})`;
    ctx.beginPath();
    ctx.arc(PAD + rnd() * (CARD_W - PAD * 2), PAD + rnd() * (IMG_H - PAD), 2 + rnd() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  caption(ctx, WORDS[i % WORDS.length]);
  s.texture.needsUpdate = true;
}

type Picture = CanvasImageSource & { width: number; height: number };

export function paintPhoto(s: CardSurface, src: Picture, label: string | null) {
  take(s);
  drawPhoto(s, src, label);
}

function drawPhoto(s: CardSurface, src: Picture, label: string | null) {
  const { ctx } = s;
  frame(ctx);
  const w = CARD_W - PAD * 2;
  const h = IMG_H - PAD;
  const r = coverRect(src.width, src.height, w, h, { x: 0.5, y: 0.42 });
  ctx.drawImage(src, r.sx, r.sy, r.sw, r.sh, PAD, PAD, w, h);
  caption(ctx, label);
  s.texture.needsUpdate = true;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
