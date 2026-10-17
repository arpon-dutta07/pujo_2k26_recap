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
