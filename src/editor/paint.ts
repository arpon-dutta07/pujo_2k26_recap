// Hand-coded art for the templates: paper, velvet, alpona arches, Shola-style
// vines, lotus ponds, patchwork. Everything is drawn from code (no copied
// images), seeded so a template always looks the same.
import { seeded } from "../lib/render/draw";

type Ctx = CanvasRenderingContext2D;

export const TAU = Math.PI * 2;

export function fill(ctx: Ctx, color: string | CanvasGradient, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Fine specks, like handmade paper.
export function grain(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed = 3, density = 1) {
  const rnd = seeded(seed);
  ctx.fillStyle = color;
  const n = Math.floor(((w * h) / 700) * density);
  for (let i = 0; i < n; i++) ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
}

// Soft light and dark blotches: velvet, old paper, mottled walls.
export function mottle(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  light: string,
  dark: string,
  seed = 5,
  amount = 1,
) {
  const rnd = seeded(seed);
  const n = Math.round(40 * amount);
  const big = Math.max(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < n; i++) {
    const cx = x + rnd() * w;
    const cy = y + rnd() * h;
    const r = big * (0.05 + rnd() * 0.22);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = i % 2 ? light : dark;
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

export function vignette(ctx: Ctx, w: number, h: number, color = "rgba(0,0,0,0.45)", inner = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * inner * 0.5, w / 2, h / 2, Math.hypot(w, h) / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function velvet(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, seed = 11) {
  fill(ctx, base, x, y, w, h);
  mottle(ctx, x, y, w, h, "rgba(255,120,140,0.10)", "rgba(20,0,5,0.28)", seed, 1.6);
  grain(ctx, x, y, w, h, "rgba(255,190,200,0.05)", seed + 1, 1.4);
  grain(ctx, x, y, w, h, "rgba(0,0,0,0.12)", seed + 2, 1.2);
}

export function shadowed(ctx: Ctx, blur: number, dy: number, color = "rgba(0,0,0,0.35)") {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = dy;
  ctx.shadowOffsetX = 0;
}

export function noShadow(ctx: Ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

// A rectangle with ragged, torn edges (local coordinates, centred on 0,0).
export function tornRectPath(ctx: CanvasPath, w: number, h: number, seed: number, jag: number, step = 9) {
  const rnd = seeded(seed);
  const pts: Array<[number, number]> = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const o = (rnd() - 0.5) * jag;
      pts.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]);
    }
  };
  const hw = w / 2;
  const hh = h / 2;
  edge(-hw, -hh, hw, -hh, 0, 1);
  edge(hw, -hh, hw, hh, 1, 0);
  edge(hw, hh, -hw, hh, 0, 1);
  edge(-hw, hh, -hw, -hh, 1, 0);
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
  ctx.closePath();
}

// Paper card: torn edges, soft shadow, a few fibres. Centre (cx, cy).
export function tornPaper(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotate: number,
  color: string,
  seed: number,
  u: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotate);
  shadowed(ctx, 22 * u, 8 * u, "rgba(0,0,0,0.35)");
  ctx.beginPath();
  tornRectPath(ctx, w, h, seed, 7 * u, 10 * u);
  ctx.fillStyle = color;
  ctx.fill();
  noShadow(ctx);
  ctx.clip();
  mottle(ctx, -w / 2, -h / 2, w, h, "rgba(255,255,255,0.18)", "rgba(120,80,40,0.10)", seed + 3, 0.5);
  grain(ctx, -w / 2, -h / 2, w, h, "rgba(90,60,30,0.08)", seed + 4);
  ctx.restore();
}

// ---------- arches (alpona doorway) ----------

export function archPath(ctx: CanvasPath, x: number, y: number, w: number, h: number) {
  const r = w / 2;
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

// Points along the left side, the top semicircle and the right side of an
// arch, each with the outward normal. Spacing is in px.
export function archPoints(x: number, y: number, w: number, h: number, spacing: number) {
  const r = w / 2;
  const side = h - r;
  const arc = Math.PI * r;
  const total = side * 2 + arc;
  const n = Math.max(3, Math.round(total / spacing));
  const out: Array<{ x: number; y: number; nx: number; ny: number }> = [];
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * total;
    if (d <= side) {
      out.push({ x, y: y + h - d, nx: -1, ny: 0 });
    } else if (d <= side + arc) {
      const a = Math.PI + ((d - side) / arc) * Math.PI;
      out.push({ x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
    } else {
      out.push({ x: x + w, y: y + r + (d - side - arc), nx: 1, ny: 0 });
    }
  }
  return out;
}

// A teardrop petal: pointed end at the origin, round end out along +y.
export function petalPath(ctx: CanvasPath, len: number, wid: number) {
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid * 0.62, len * 0.32, wid * 0.58, len, 0, len);
  ctx.bezierCurveTo(-wid * 0.58, len, -wid * 0.62, len * 0.32, 0, 0);
  ctx.closePath();
}

// Alpona doorway frame around an arch-shaped photo window: a ring of
// teardrop petals, a solid band and a white dotted line.
export function alponaArch(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number,
  colors: { band: string; petal: string; line: string },
  part: "petals" | "band",
) {
  const band = 30 * u;
  if (part === "petals") {
    const off = band - 4 * u;
    const pts = archPoints(x - off, y - off, w + off * 2, h + off, 44 * u);
    for (const p of pts) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.ny, p.nx) - Math.PI / 2);
      ctx.beginPath();
      petalPath(ctx, 62 * u, 46 * u);
      ctx.fillStyle = colors.petal;
      ctx.fill();
      ctx.translate(0, 13 * u);
      ctx.scale(0.6, 0.62);
      ctx.beginPath();
      petalPath(ctx, 62 * u, 46 * u);
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 4.5 * u;
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  const mid = band / 2 - 4 * u;
  ctx.save();
  ctx.beginPath();
  archPath(ctx, x - mid, y - mid, w + mid * 2, h + mid * 2);
  ctx.strokeStyle = colors.band;
  ctx.lineWidth = band;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.setLineDash([0.01, 15 * u]);
  ctx.lineCap = "round";
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 6 * u;
  ctx.stroke();
  ctx.restore();
}

// ---------- flowers and vines ----------

export function daisy(ctx: Ctx, cx: number, cy: number, r: number, petals: number, color: string, center: string, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i / petals) * TAU);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.26, r * 0.48, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function leaf(ctx: Ctx, x: number, y: number, len: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function curl(ctx: Ctx, x: number, y: number, r: number, dir: number, color: string, lw: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const a = t * Math.PI * 1.7;
    const rr = r * (1 - t * 0.75);
    const px = Math.sin(a) * rr;
    const py = -Math.cos(a) * rr + r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

// Shola-pith style vine running along one straight edge, mirrored from its middle.
function vineAlong(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  u: number,
  color: string,
  accent: string,
) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  const amp = 16 * u;
  const waves = Math.max(2, Math.round(len / (190 * u)));
  const lambda = len / waves;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * len;
    const yy = Math.sin((t / lambda) * TAU) * amp;
    if (i) ctx.lineTo(t, yy);
    else ctx.moveTo(t, yy);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 * u;
  ctx.lineCap = "round";
  ctx.stroke();
  for (let k = 0; k < waves * 2; k++) {
    const t = (k + 0.25) * (lambda / 2);
    const side = k % 2 ? 1 : -1;
    const yy = Math.sin((t / lambda) * TAU) * amp;
    if (k % 2 === 0) {
      daisy(ctx, t, yy + side * 26 * u, 17 * u, 6, color, accent, k * 0.4);
      leaf(ctx, t + 4 * u, yy, 26 * u, side * -0.9, color);
    } else {
      curl(ctx, t, yy, 15 * u, side, color, 3.4 * u);
      leaf(ctx, t - 30 * u, yy - side * 4 * u, 24 * u, Math.PI + side * 0.8, color);
      leaf(ctx, t + 8 * u, yy + side * 3 * u, 22 * u, side * 0.7, color);
    }
  }
  ctx.restore();
}

// Red-and-white folk border: vines down every side, a big flower in each corner.
export function vineBorder(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  band: number,
  u: number,
  color: string,
  accent: string,
) {
  const m = band / 2;
  const c = band * 0.9;
  vineAlong(ctx, x + c, y + m, x + w - c, y + m, u, color, accent);
  vineAlong(ctx, x + w - c, y + h - m, x + c, y + h - m, u, color, accent);
  vineAlong(ctx, x + m, y + h - c, x + m, y + c, u, color, accent);
  vineAlong(ctx, x + w - m, y + c, x + w - m, y + h - c, u, color, accent);
  const corners: Array<[number, number]> = [
    [x + m, y + m],
    [x + w - m, y + m],
    [x + m, y + h - m],
    [x + w - m, y + h - m],
  ];
  for (const [cx, cy] of corners) {
    for (let i = 0; i < 4; i++) leaf(ctx, cx, cy, 40 * u, (i / 4) * TAU + Math.PI / 4, color);
    daisy(ctx, cx, cy, 34 * u, 8, color, accent);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * u, 0, TAU);
    ctx.fill();
  }
}

// Two thin lines with slanted leaf-dashes between them, like a rope, around a rounded window.
export function ropeFrame(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, u: number, color: string) {
  const gap = 11 * u;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.roundRect(x - gap, y - gap, w + gap * 2, h + gap * 2, r + gap);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + gap * 0.15, y + gap * 0.15, w - gap * 0.3, h - gap * 0.3, Math.max(0, r - gap * 0.15));
  ctx.stroke();
  // dashes along the middle of the band
  ctx.fillStyle = color;
  const per = 2 * (w + h);
  const n = Math.round(per / (15 * u));
  const pts = rectPerimeterPoints(x - gap / 2, y - gap / 2, w + gap, h + gap, r + gap / 2, n);
  for (const pt of pts) {
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.a + 0.75);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * u, 2.6 * u, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Evenly spaced points (with tangent angle) around a rounded rectangle.
export function rectPerimeterPoints(x: number, y: number, w: number, h: number, r: number, n: number) {
  r = Math.min(r, w / 2, h / 2);
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const q = (Math.PI / 2) * r;
  const total = 2 * sw + 2 * sh + 4 * q;
  const out: Array<{ x: number; y: number; a: number }> = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total;
    const seg = (len: number) => {
      if (d <= len) return true;
      d -= len;
      return false;
    };
    if (seg(sw)) out.push({ x: x + r + d, y, a: 0 });
    else if (seg(q)) {
      const a = -Math.PI / 2 + d / r;
      out.push({ x: x + w - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, a: a + Math.PI / 2 });
    } else if (seg(sh)) out.push({ x: x + w, y: y + r + d, a: Math.PI / 2 });
    else if (seg(q)) {
      const a = d / r;
      out.push({ x: x + w - r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r, a: a + Math.PI / 2 });
    } else if (seg(sw)) out.push({ x: x + w - r - d, y: y + h, a: Math.PI });
    else if (seg(q)) {
      const a = Math.PI / 2 + d / r;
      out.push({ x: x + r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r, a: a + Math.PI / 2 });
    } else if (seg(sh)) out.push({ x, y: y + h - r - d, a: -Math.PI / 2 });
    else {
      const a = Math.PI + d / r;
      out.push({ x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, a: a + Math.PI / 2 });
    }
  }
  return out;
}

// Dotted ring (the Sarachitra circle frame).
export function dotRing(ctx: Ctx, cx: number, cy: number, r: number, dot: number, gap: number, color: string) {
  const n = Math.max(8, Math.round((TAU * r) / gap));
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dot, 0, TAU);
    ctx.fill();
  }
}

export function ring(ctx: Ctx, cx: number, cy: number, r: number, lw: number, color: string) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// ---------- lotus pond (পদ্মবন) ----------

const GOLD_LINE = "#d9a441";

function vesica(ctx: Ctx, len: number, wid: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
  ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
  ctx.closePath();
}

function petal(ctx: Ctx, len: number, wid: number, rot: number, base: string, tip: string, u: number) {
  ctx.save();
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  g.addColorStop(0, base);
  g.addColorStop(1, tip);
  vesica(ctx, len, wid);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.12);
  ctx.quadraticCurveTo(wid * 0.12, -len * 0.5, 0, -len * 0.86);
  ctx.strokeStyle = "rgba(255,230,200,0.55)";
  ctx.lineWidth = 1.4 * u;
  ctx.stroke();
  ctx.restore();
}

// Side view of an open lotus: base at (x, y), roughly `s` tall.
export function lotusBloom(ctx: Ctx, x: number, y: number, s: number, rot: number, u: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const deep = "#c4456b";
  const mid = "#e77f8f";
  const light = "#f9c3a8";
  petal(ctx, s * 0.62, s * 0.2, -1.05, deep, light, u);
  petal(ctx, s * 0.62, s * 0.2, 1.05, deep, light, u);
  petal(ctx, s * 0.84, s * 0.24, -0.55, deep, light, u);
  petal(ctx, s * 0.84, s * 0.24, 0.55, deep, light, u);
  petal(ctx, s * 0.98, s * 0.27, 0, mid, light, u);
  ctx.translate(0, s * 0.04);
  petal(ctx, s * 0.66, s * 0.22, -0.24, deep, mid, u);
  petal(ctx, s * 0.66, s * 0.22, 0.24, deep, mid, u);
  ctx.restore();
}

export function lotusBud(ctx: Ctx, x: number, y: number, s: number, rot: number, u: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  petal(ctx, s * 0.9, s * 0.3, 0, "#b5345a", "#ef9aa4", u);
  petal(ctx, s * 0.6, s * 0.22, -0.32, "#9e2a4c", "#d9637d", u);
  petal(ctx, s * 0.6, s * 0.22, 0.32, "#9e2a4c", "#d9637d", u);
  ctx.restore();
}

// A round lotus leaf seen at an angle, with gold veins and a notch.
export function lotusLeaf(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rot: number, u: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(-rx * 0.2, -ry * 0.3, 0, 0, 0, rx);
  g.addColorStop(0, "#3f8a5c");
  g.addColorStop(1, "#1d4f35");
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.ellipse(0, 0, rx, ry, 0, -Math.PI / 2 + 0.12, Math.PI * 1.5 - 0.12);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  ctx.strokeStyle = "rgba(217,164,65,0.75)";
  ctx.lineWidth = 1.3 * u;
  for (let i = 1; i < 12; i++) {
    const a = -Math.PI / 2 + 0.12 + (i / 12) * (TAU - 0.24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * rx * 0.92, Math.sin(a) * ry * 0.92);
    ctx.stroke();
  }
  ctx.restore();
}

export function stem(ctx: Ctx, pts: Array<[number, number]>, width: number, u: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.lineCap = "round";
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = width + 2.5 * u;
  ctx.stroke();
  ctx.strokeStyle = "#2f6b45";
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

// Thin gold sprig with seed dots.
export function sprig(ctx: Ctx, x: number, y: number, len: number, rot: number, u: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = GOLD_LINE;
  ctx.fillStyle = GOLD_LINE;
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.15, -len * 0.5, 0, -len);
  ctx.stroke();
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const py = -len * t;
    const px = len * 0.15 * Math.sin(t * Math.PI) * 0.9;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + side * len * 0.12, py - len * 0.06);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px + side * len * 0.13, py - len * 0.07, 2.4 * u, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// A line, a diamond, a small lotus, a diamond, a line.
export function lotusDivider(ctx: Ctx, cx: number, cy: number, w: number, u: number, color = GOLD_LINE) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8 * u;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 34 * u, cy);
    ctx.lineTo(cx + side * (w / 2), cy);
    ctx.stroke();
    const dx = cx + side * (w * 0.3);
    ctx.beginPath();
    ctx.moveTo(dx, cy - 6 * u);
    ctx.lineTo(dx + 6 * u, cy);
    ctx.lineTo(dx, cy + 6 * u);
    ctx.lineTo(dx - 6 * u, cy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + side * (w * 0.42), cy, 3 * u, 0, TAU);
    ctx.fill();
  }
  ctx.translate(cx, cy + 10 * u);
  const leaves: Array<[number, number]> = [
    [-0.9, 16],
    [0.9, 16],
    [-0.42, 22],
    [0.42, 22],
    [0, 26],
  ];
  for (const [r, l] of leaves) {
    ctx.save();
    ctx.rotate(r);
    vesica(ctx, l * u, 6 * u);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ---------- textiles ----------

type Patch = { x: number; y: number; w: number; h: number };

// Splits a rectangle into uneven columns and rows, like a pieced quilt.
export function quiltPatches(x: number, y: number, w: number, h: number, seed: number, cell: number): Patch[] {
  const rnd = seeded(seed);
  const out: Patch[] = [];
  let cx = x;
  while (cx < x + w - 1) {
    const cw = Math.min(x + w - cx, cell * (0.7 + rnd() * 0.8));
    let cy = y - rnd() * cell * 0.5;
    while (cy < y + h - 1) {
      const ch = cell * (0.6 + rnd() * 1.1);
      out.push({ x: cx, y: cy, w: cw, h: ch });
      cy += ch;
    }
    cx += cw;
  }
  return out;
}

function mihrab(ctx: Ctx, p: Patch, color: string, accent: string, u: number) {
  const ix = p.x + p.w * 0.18;
  const iw = p.w * 0.64;
  const top = p.y + p.h * 0.12;
  const bottom = p.y + p.h * 0.9;
  const shoulder = top + Math.min(iw * 0.7, (bottom - top) * 0.45);
  ctx.beginPath();
  ctx.moveTo(ix, bottom);
  ctx.lineTo(ix, shoulder);
  ctx.quadraticCurveTo(ix, top + (shoulder - top) * 0.3, ix + iw / 2, top);
  ctx.quadraticCurveTo(ix + iw, top + (shoulder - top) * 0.3, ix + iw, shoulder);
  ctx.lineTo(ix + iw, bottom);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  const cx = ix + iw / 2;
  const cy = (shoulder + bottom) / 2;
  daisy(ctx, cx, cy, Math.min(iw, bottom - top) * 0.22, 8, accent, color);
}

function medallion(ctx: Ctx, p: Patch, color: string, accent: string, u: number) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const r = Math.min(p.w, p.h) * 0.36;
  const rings: Array<[number, string]> = [
    [1, color],
    [0.66, accent],
    [0.34, color],
  ];
  for (const [k, c] of rings) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * k);
    ctx.lineTo(cx + r * k * 0.8, cy);
    ctx.lineTo(cx, cy + r * k);
    ctx.lineTo(cx - r * k * 0.8, cy);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }
  ctx.fillStyle = accent;
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    ctx.beginPath();
    ctx.arc(cx + dx * p.w * 0.32, cy + dy * p.h * 0.32, 5 * u, 0, TAU);
    ctx.fill();
  }
}

function lattice(ctx: Ctx, p: Patch, color: string, accent: string, u: number) {
  const step = 34 * u;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4 * u;
  for (let d = -p.h; d < p.w + p.h; d += step) {
    ctx.beginPath();
    ctx.moveTo(p.x + d, p.y);
    ctx.lineTo(p.x + d - p.h, p.y + p.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x + d - p.h, p.y);
    ctx.lineTo(p.x + d, p.y + p.h);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  let row = 0;
  for (let yy = p.y; yy < p.y + p.h + step; yy += step / 2, row++) {
    for (let xx = p.x + (row % 2 ? step / 2 : 0); xx < p.x + p.w + step; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, 3.6 * u, 0, TAU);
      ctx.fill();
    }
  }
}

function florets(ctx: Ctx, p: Patch, color: string, accent: string, u: number) {
  const step = 46 * u;
  let row = 0;
  for (let yy = p.y + step / 2; yy < p.y + p.h + step; yy += step * 0.86, row++) {
    for (let xx = p.x + (row % 2 ? step / 2 : 0); xx < p.x + p.w + step; xx += step) {
      daisy(ctx, xx, yy, 14 * u, 5, color, accent, row);
    }
  }
}

function stripes(ctx: Ctx, p: Patch, color: string, accent: string, u: number) {
  const step = 28 * u;
  let i = 0;
  for (let yy = p.y + step / 2; yy < p.y + p.h; yy += step, i++) {
    ctx.fillStyle = i % 2 ? color : accent;
    ctx.fillRect(p.x, yy, p.w, 7 * u);
    if (i % 2 === 0) {
      ctx.beginPath();
      let k = 0;
      for (let xx = p.x; xx <= p.x + p.w + 12 * u; xx += 12 * u, k++) {
        const py = yy + 16 * u + (k % 2 ? -5 : 5) * u;
        if (k) ctx.lineTo(xx, py);
        else ctx.moveTo(xx, py);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * u;
      ctx.stroke();
    }
  }
}

function paisley(ctx: Ctx, p: Patch, color: string, accent: string, u: number, rnd: () => number) {
  for (let i = 0; i < 2; i++) {
    const cx = p.x + p.w * (0.3 + 0.4 * i);
    const cy = p.y + p.h * (0.35 + 0.3 * ((i + 1) % 2));
    const s = Math.min(p.w, p.h) * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rnd() * 0.8 - 0.4 + i * Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.bezierCurveTo(-s * 0.75, s * 0.4, -s * 0.6, -s * 0.6, 0, -s * 0.55);
    ctx.bezierCurveTo(s * 0.5, -s * 0.5, s * 0.55, 0, s * 0.25, s * 0.05);
    ctx.bezierCurveTo(s * 0.05, s * 0.1, s * 0.15, s * 0.3, s * 0.35, s * 0.3);
    ctx.bezierCurveTo(s * 0.3, s * 0.55, s * 0.15, s * 0.6, 0, s * 0.55);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4 * u;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.05, s * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// A quilt of block-printed patches (the carpet and the pink textile looks).
export function quilt(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: string[],
  seed: number,
  u: number,
  cell = 210,
) {
  const rnd = seeded(seed);
  const patches = quiltPatches(x, y, w, h, seed, cell * u);
  const kinds = [mihrab, medallion, lattice, florets, stripes];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (const p of patches) {
    const bi = Math.floor(rnd() * palette.length);
    const base = palette[bi];
    const color = palette[(bi + 1 + Math.floor(rnd() * (palette.length - 1))) % palette.length];
    const accent = palette[(palette.indexOf(color) + 2) % palette.length];
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    fill(ctx, base, p.x, p.y, p.w, p.h);
    const k = Math.floor(rnd() * (kinds.length + 1));
    if (k < kinds.length) kinds[k](ctx, p, color, accent, u);
    else paisley(ctx, p, color, accent, u, rnd);
    // stitched seam
    ctx.strokeStyle = "rgba(255,240,215,0.85)";
    ctx.lineWidth = 3 * u;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.setLineDash([7 * u, 6 * u]);
    ctx.strokeStyle = "rgba(255,240,215,0.5)";
    ctx.lineWidth = 1.5 * u;
    ctx.strokeRect(p.x + 7 * u, p.y + 7 * u, p.w - 14 * u, p.h - 14 * u);
    ctx.setLineDash([]);
    ctx.restore();
  }
  grain(ctx, x, y, w, h, "rgba(0,0,0,0.10)", seed + 9, 1.2);
  mottle(ctx, x, y, w, h, "rgba(255,255,255,0.06)", "rgba(0,0,0,0.12)", seed + 4, 0.8);
  ctx.restore();
}

// ---------- paper bits ----------

// Lace doily frame: scalloped edge, punched holes, embossed inner line.
export function laceFrame(ctx: Ctx, x: number, y: number, w: number, h: number, u: number) {
  const pad = 46 * u;
  const ox = x - pad;
  const oy = y - pad;
  const ow = w + pad * 2;
  const oh = h + pad * 2;
  const step = 30 * u;
  const nx = Math.round(ow / step);
  const ny = Math.round(oh / step);
  const sx = ow / nx;
  const sy = oh / ny;
  const path = new Path2D();
  path.moveTo(ox, oy);
  for (let i = 0; i < nx; i++) path.arc(ox + sx * (i + 0.5), oy, sx / 2, Math.PI, 0);
  for (let i = 0; i < ny; i++) path.arc(ox + ow, oy + sy * (i + 0.5), sy / 2, -Math.PI / 2, Math.PI / 2);
  for (let i = nx - 1; i >= 0; i--) path.arc(ox + sx * (i + 0.5), oy + oh, sx / 2, 0, Math.PI);
  for (let i = ny - 1; i >= 0; i--) path.arc(ox, oy + sy * (i + 0.5), sy / 2, Math.PI / 2, Math.PI * 1.5);
  path.closePath();
  ctx.save();
  shadowed(ctx, 26 * u, 10 * u, "rgba(40,30,10,0.35)");
  ctx.fillStyle = "#f4eddc";
  ctx.fill(path);
  noShadow(ctx);
  ctx.fillStyle = "#cdbf9f";
  for (let i = 0; i < nx; i++) {
    ctx.beginPath();
    ctx.arc(ox + sx * (i + 0.5), oy + 10 * u, 4 * u, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ox + sx * (i + 0.5), oy + oh - 10 * u, 4 * u, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < ny; i++) {
    ctx.beginPath();
    ctx.arc(ox + 10 * u, oy + sy * (i + 0.5), 4 * u, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ox + ow - 10 * u, oy + sy * (i + 0.5), 4 * u, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(160,140,100,0.55)";
  ctx.lineWidth = 2 * u;
  ctx.strokeRect(ox + 24 * u, oy + 24 * u, ow - 48 * u, oh - 48 * u);
  ctx.strokeRect(x - 8 * u, y - 8 * u, w + 16 * u, h + 16 * u);
  const pts = rectPerimeterPoints(x - 16 * u, y - 16 * u, w + 32 * u, h + 32 * u, 0, Math.round((2 * (w + h)) / (26 * u)));
  ctx.fillStyle = "rgba(170,150,110,0.6)";
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2 * u, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Music player card on torn paper: icons only, the words are template text.
export function playerCard(ctx: Ctx, cx: number, cy: number, w: number, h: number, rot: number, u: number) {
  tornPaper(ctx, cx, cy, w, h, rot, "#d8c9b0", 61, u);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const ink = "#2a1712";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 4 * u;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const L = -w / 2 + 70 * u;
  const R = w / 2 - 70 * u;
  ctx.save();
  ctx.translate(L, -h / 2 + 52 * u);
  ctx.beginPath();
  ctx.moveTo(0, 12 * u);
  ctx.bezierCurveTo(-24 * u, -4 * u, -12 * u, -22 * u, 0, -10 * u);
  ctx.bezierCurveTo(12 * u, -22 * u, 24 * u, -4 * u, 0, 12 * u);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(R - 20 * u + i * 12 * u, -h / 2 + 50 * u, 3.4 * u, 0, TAU);
    ctx.fill();
  }
  const py = h * 0.08;
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(L, py);
  ctx.lineTo(R, py);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(L + (R - L) * 0.07, py, 9 * u, 0, TAU);
  ctx.fill();
  const cyc = h * 0.3;
  ctx.beginPath();
  ctx.arc(0, cyc, 40 * u, 0, TAU);
  ctx.stroke();
  ctx.fillRect(-12 * u, cyc - 16 * u, 8 * u, 32 * u);
  ctx.fillRect(4 * u, cyc - 16 * u, 8 * u, 32 * u);
  for (const side of [-1, 1]) {
    const x = side * 130 * u;
    ctx.beginPath();
    ctx.moveTo(x + side * 14 * u, cyc - 14 * u);
    ctx.lineTo(x - side * 8 * u, cyc);
    ctx.lineTo(x + side * 14 * u, cyc + 14 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - side * 8 * u - (side > 0 ? 5 * u : 0), cyc - 14 * u, 5 * u, 28 * u);
  }
  const sx = -250 * u;
  ctx.beginPath();
  ctx.moveTo(sx - 18 * u, cyc - 10 * u);
  ctx.bezierCurveTo(sx, cyc - 10 * u, sx, cyc + 10 * u, sx + 18 * u, cyc + 10 * u);
  ctx.moveTo(sx - 18 * u, cyc + 10 * u);
  ctx.bezierCurveTo(sx, cyc + 10 * u, sx, cyc - 10 * u, sx + 18 * u, cyc - 10 * u);
  ctx.stroke();
  const rx = 250 * u;
  ctx.beginPath();
  ctx.roundRect(rx - 18 * u, cyc - 11 * u, 36 * u, 22 * u, 8 * u);
  ctx.stroke();
  ctx.restore();
}

// Torn-paper backing behind a photo slot (same centre and turn as the slot).
export function photoBacking(
  ctx: Ctx,
  s: { x: number; y: number; w: number; h: number; rotate?: number },
  border: number,
  seed: number,
  u: number,
  color = "#fbf6ec",
) {
  tornPaper(ctx, s.x + s.w / 2, s.y + s.h / 2, s.w + border * 2, s.h + border * 2, ((s.rotate ?? 0) * Math.PI) / 180, color, seed, u);
}
