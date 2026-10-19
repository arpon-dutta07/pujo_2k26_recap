// Turns finished moodboard images into studio templates.
//
//   moodboard/originals/<id>__story.(webp|png|jpg)   untouched moodboard image
//   moodboard/templates.json                          { "<id>": { "name": "...", "photos": 2 } }
//
// For each image it finds the empty photo windows (large, flat, single-colour
// regions), cuts them out exactly (tilted ones too), and writes:
//
//   public/templates/<id>__story.webp         the picture with see-through windows
//   public/templates/<id>__story.thumb.webp   small preview with plain windows
//   src/editor/templates.generated.json      window positions for the studio
//   moodboard/debug/<id>__story.png           check sheet: windows in pink, boxes in red
//
// Run: npm run templates
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ORIGINALS = "moodboard/originals";
const MANIFEST = "moodboard/templates.json";
const OUT = "public/templates";
const DEBUG = "moodboard/debug";
const INDEX = "src/editor/templates.generated.json";
const SIZE = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 } };

const FLAT_STD = 4.2; // max local brightness spread inside a window (0-255)
const COLOUR_DIST = 26; // how far a window pixel may drift from the window colour
const MIN_AREA = 0.012; // a window covers at least 1.2% of the picture
const GROW = 2; // px eaten into the frame edge so no paper line shows
const MARGIN = 3; // px the photo overlaps the window on each side
const ERODE = 2; // half-size px shaved off flat areas before grouping them

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DEBUG, { recursive: true });

// ---------- helpers ----------

function localStd(grey, w, h, r) {
  const W1 = w + 1;
  const s = new Float64Array(W1 * (h + 1));
  const s2 = new Float64Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    let row2 = 0;
    for (let x = 0; x < w; x++) {
      const v = grey[y * w + x];
      row += v;
      row2 += v * v;
      s[(y + 1) * W1 + x + 1] = s[y * W1 + x + 1] + row;
      s2[(y + 1) * W1 + x + 1] = s2[y * W1 + x + 1] + row2;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const n = (y1 - y0) * (x1 - x0);
      const a = s[y1 * W1 + x1] - s[y0 * W1 + x1] - s[y1 * W1 + x0] + s[y0 * W1 + x0];
      const b = s2[y1 * W1 + x1] - s2[y0 * W1 + x1] - s2[y1 * W1 + x0] + s2[y0 * W1 + x0];
      const m = a / n;
      out[y * w + x] = Math.sqrt(Math.max(0, b / n - m * m));
    }
  }
  return out;
}

// Keeps a pixel only if every pixel within r of it is set.
function erode(mask, w, h, r) {
  const rows = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let ok = 1;
      for (let d = -r; d <= r && ok; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= w || !mask[y * w + xx]) ok = 0;
      }
      rows[y * w + x] = ok;
    }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let ok = 1;
      for (let d = -r; d <= r && ok; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= h || !rows[yy * w + x]) ok = 0;
      }
      out[y * w + x] = ok;
    }
  return out;
}

// 4-connected components of mask; returns arrays of pixel indices.
function components(mask, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const out = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    seen[i] = 1;
    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) (seen[p - 1] = 1), (queue[tail++] = p - 1);
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) (seen[p + 1] = 1), (queue[tail++] = p + 1);
      if (y > 0 && mask[p - w] && !seen[p - w]) (seen[p - w] = 1), (queue[tail++] = p - w);
      if (y < h - 1 && mask[p + w] && !seen[p + w]) (seen[p + w] = 1), (queue[tail++] = p + w);
    }
    if (tail >= minArea) out.push(queue.slice(0, tail));
  }
  return out;
}

function bbox(pixels, w) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (const p of pixels) {
    const x = p % w;
    const y = (p - x) / w;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Smallest rotated rectangle (within +-40 degrees) around the window's edge points.
function rotatedBox(edge) {
  let best = null;
  for (let d = -40; d <= 40; d += 0.25) {
    const a = (d * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (const [x, y] of edge) {
      const u = x * c + y * s;
      const v = -x * s + y * c;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area - 1e-6) best = { area, d, u0, u1, v0, v1, c, s };
  }
  const cu = (best.u0 + best.u1) / 2;
  const cv = (best.v0 + best.v1) / 2;
  const cx = cu * best.c - cv * best.s;
  const cy = cu * best.s + cv * best.c;
  const rotate = Math.abs(best.d) < 1 ? 0 : best.d;
  return { cx, cy, w: best.u1 - best.u0 + 1, h: best.v1 - best.v0 + 1, rotate, deg: best.d };
}

// ---------- clean window shapes ----------
//
// The colour mask follows every speck of blank paper, so its edge comes out
// ragged, like a brush stroke. Instead each window gets the clean shape that
// best matches the mask (a rectangle, maybe with round corners, an arch or an
// oval), and the hole is exactly that shape with a smooth one-pixel edge.
// Things lying across a window in the art (tape, pegs, a neighbouring frame)
// stay on top.

const OCCLUDER_DEPTH = 12; // px something must reach into a window to count as lying on it
const OPEN = 4; // px: thinner slivers along the edge are paper noise, not objects
const OCCLUDER_COLOUR = 150; // median colour distance from the paper that marks a real object
const OCCLUDER_TEXTURE = 0.3; // or this share of its pixels busy (tape print, wood, petals)
const BUSY_STD = 16; // local brightness spread that counts as busy (stains on old paper stay below it)
const ROUND_FIT = 0.985; // an arch or oval must cover the window this well, or the outline is used
const SNAP_REACH = 80; // px inside a side where the search for its edge starts
const SNAP_MAX = 30; // px a side may move out

// Pixel centres of a window mask, in picture coordinates.
function maskPoints(win, rw, rh, X0, Y0) {
  let n = 0;
  for (let j = 0; j < rw * rh; j++) n += win[j];
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  let k = 0;
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++)
      if (win[y * rw + x]) {
        xs[k] = X0 + x + 0.5;
        ys[k] = Y0 + y + 0.5;
        k++;
      }
  return { xs, ys, n };
}

// Where a projection profile drops below half its plateau, walking out from
// the middle. Bumps and notches along an edge barely move it.
function halfEdges(h) {
  let total = 0;
  for (const v of h) total += v;
  const at = (q) => {
    let acc = 0;
    for (let b = 0; b < h.length; b++) if ((acc += h[b]) >= total * q) return b;
    return h.length - 1;
  };
  const mid = at(0.5);
  const vals = Array.from(h.slice(at(0.3), at(0.7) + 1)).sort((a, b) => a - b);
  const p = vals[vals.length >> 1] || 1;
  const f = (b) => (b < 0 || b >= h.length ? 0 : Math.min(1, h[b] / p));
  let lo = mid;
  while (lo > 0 && h[lo - 1] >= p / 2) lo--;
  let hi = mid;
  while (hi < h.length - 1 && h[hi + 1] >= p / 2) hi++;
  return [lo + 1 - f(lo) - f(lo - 1), hi + f(hi) + f(hi + 1)];
}

// The rectangle at this angle whose sides sit on the mask's half-way lines.
function fitAt(pts, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const { xs, ys, n } = pts;
  const U = new Float32Array(n);
  const V = new Float32Array(n);
  let umin = Infinity;
  let umax = -Infinity;
  let vmin = Infinity;
  let vmax = -Infinity;
  for (let i = 0; i < n; i++) {
    const u = xs[i] * c + ys[i] * s;
    const v = -xs[i] * s + ys[i] * c;
    U[i] = u;
    V[i] = v;
    if (u < umin) umin = u;
    if (u > umax) umax = u;
    if (v < vmin) vmin = v;
    if (v > vmax) vmax = v;
  }
  const ub = Math.floor(umin);
  const vb = Math.floor(vmin);
  const hu = new Float64Array(Math.floor(umax) - ub + 1);
  const hv = new Float64Array(Math.floor(vmax) - vb + 1);
  for (let i = 0; i < n; i++) {
    hu[Math.floor(U[i]) - ub]++;
    hv[Math.floor(V[i]) - vb]++;
  }
  const [eu0, eu1] = halfEdges(hu);
  const [ev0, ev1] = halfEdges(hv);
  const box = { deg, c, s, U, V, u0: ub + eu0, u1: ub + eu1, v0: vb + ev0, v1: vb + ev1 };
  const sh = { kind: "rect", uc: (box.u0 + box.u1) / 2, vc: (box.v0 + box.v1) / 2, hw: (box.u1 - box.u0) / 2, hh: (box.v1 - box.v0) / 2, r: 0 };
  box.iou = shapeIou(sh, U, V, n);
  return box;
}

function sdBox(px, py, bx, by, r = 0) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Signed distance (px, negative inside) from a point to the shape's outline;
// (lu, lv) are relative to the shape's centre in its own turned axes.
function sdShape(sh, lu, lv) {
  if (sh.kind === "quad") {
    let d = -Infinity;
    for (const [nx, ny, off] of sh.lines) d = Math.max(d, nx * lu + ny * lv - off);
    return d;
  }
  if (sh.kind === "rect") return sdBox(lu, lv, sh.hw, sh.hh, sh.r);
  if (sh.kind === "arch") {
    const R = sh.hw;
    const cy = -sh.hh + R; // centre of the round top
    const box = sdBox(lu, lv - (cy + sh.hh) / 2, sh.hw, (sh.hh - cy) / 2);
    return Math.min(box, Math.hypot(lu, lv - cy) - R);
  }
  return (Math.hypot(lu / sh.hw, lv / sh.hh) - 1) * Math.min(sh.hw, sh.hh);
}

function shapeArea(sh) {
  if (sh.kind === "rect") return 4 * sh.hw * sh.hh - (4 - Math.PI) * sh.r * sh.r;
  if (sh.kind === "arch") return 2 * sh.hw * (2 * sh.hh - sh.hw) + (Math.PI * sh.hw * sh.hw) / 2;
  return Math.PI * sh.hw * sh.hh;
}

function shapeIou(sh, U, V, n) {
  let inside = 0;
  for (let i = 0; i < n; i++) if (sdShape(sh, U[i] - sh.uc, V[i] - sh.vc) <= 0) inside++;
  return inside / (n + shapeArea(sh) - inside);
}

// The clean shape that best covers the window mask.
function fitShape(pts, startDeg) {
  let best = fitAt(pts, 0);
  for (let d = startDeg - 3; d <= startDeg + 3.001; d += 0.5) {
    const f = fitAt(pts, d);
    if (f.iou > best.iou) best = f;
  }
  for (let d = best.deg - 0.5; d <= best.deg + 0.501; d += 0.1) {
    const f = fitAt(pts, d);
    if (f.iou > best.iou) best = f;
  }
  const { U, V, u0, u1, v0, v1 } = best;
  const n = pts.n;
  const uc = (u0 + u1) / 2;
  const hw = (u1 - u0) / 2;
  const candidates = [{ kind: "rect", uc, vc: (v0 + v1) / 2, hw, hh: (v1 - v0) / 2, r: 0 }];
  // An arch's half-way line sits a little below its very top.
  for (let k = 0; k <= Math.round(hw * 0.3); k += 2) {
    const top = v0 - k;
    candidates.push({ kind: "arch", uc, vc: (top + v1) / 2, hw, hh: (v1 - top) / 2 });
  }
  for (let f = 1; f <= 1.2001; f += 0.02) candidates.push({ kind: "oval", uc, vc: (v0 + v1) / 2, hw: hw * f, hh: ((v1 - v0) / 2) * f });
  let pick = null;
  for (const sh of candidates) {
    sh.iou = shapeIou(sh, U, V, n);
    if (!pick || sh.iou > pick.iou) pick = sh;
  }
  // A sharp rectangle unless something else is clearly better. A round shape
  // that only roughly fits (a scalloped arch, say) is cut along the window's
  // own outline instead.
  if (candidates[0].iou >= pick.iou - 0.004) pick = candidates[0];
  else if (pick.iou < ROUND_FIT) pick = { kind: "free", iou: pick.iou };
  return { ...pick, deg: best.deg, c: best.c, s: best.s };
}

// Moves each straight side onto the first sharp colour step met walking out
// from inside the window. The median across the side ignores tape or pegs
// lying over part of it, and a frame of nearly the paper's shade still shows
// as a step. Each half of a side is also measured on its own: if the halves
// disagree, the shape is turned a little and measured again, so the edges end
// up parallel to the real ones.
function snapSides(sh0, distAt, jump, W, H) {
  let sh = sh0;
  for (let pass = 0; pass < 4; pass++) {
    const { next, tilt } = snapOnce(sh, distAt, jump, W, H);
    sh = next;
    if (pass === 3 || tilt === null || Math.abs(tilt) < 0.03) break;
    sh = turnShape(sh, tilt);
  }
  return sh;
}

function turnShape(sh, dDeg) {
  const cx = sh.uc * sh.c - sh.vc * sh.s;
  const cy = sh.uc * sh.s + sh.vc * sh.c;
  const deg = sh.deg + dDeg;
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { ...sh, deg, c, s, uc: cx * c + cy * s, vc: -cx * s + cy * c };
}

function snapOnce(sh, distAt, jump, W, H) {
  const at = (lu, lv) => {
    const u = sh.uc + lu;
    const v = sh.vc + lv;
    const x = Math.round(u * sh.c - v * sh.s);
    const y = Math.round(u * sh.s + v * sh.c);
    return x < 0 || y < 0 || x >= W || y >= H ? 999 : distAt(x, y);
  };
  // How far outside the side (at distance `half` from the centre) the edge
  // is, sampling the side from `from` to `to`; null if there is no clear step.
  const edgeAt = (point, half, from, to) => {
    const start = -Math.min(half * 0.6, SNAP_REACH);
    const med = [];
    for (let t = start; t <= SNAP_MAX; t++) {
      const vals = [];
      for (let a = from; a <= to; a += 2) vals.push(point(half + t, a));
      vals.sort((p, q) => p - q);
      med.push(vals[vals.length >> 1]);
    }
    const base = [...med.slice(0, 10)].sort((p, q) => p - q)[5];
    for (let k = 1; k < med.length; k++)
      if (med[k] > base + jump) {
        const lo = med[k - 1];
        const f = Math.min(1, Math.max(0, (base + jump - lo) / (med[k] - lo || 1)));
        return start + k - 1 + f;
      }
    return null;
  };
  const arch = sh.kind === "arch";
  if (sh.kind !== "rect" && sh.kind !== "arch") return { next: sh, tilt: null };
  // straight parts of the left and right sides (an arch's round top is left alone)
  const vFrom = arch ? -sh.hh + sh.hw * 1.1 : -sh.hh * 0.7;
  const vTo = sh.hh * (arch ? 0.85 : 0.7);
  const sides = {
    L: { point: (n, a) => at(-n, a), half: sh.hw, from: vFrom, to: vTo, sign: 1 },
    R: { point: (n, a) => at(n, a), half: sh.hw, from: vFrom, to: vTo, sign: -1 },
    B: { point: (n, a) => at(a, n), half: sh.hh, from: -sh.hw * 0.7, to: sh.hw * 0.7, sign: 1 },
  };
  if (!arch) sides.T = { point: (n, a) => at(a, -n), half: sh.hh, from: -sh.hw * 0.7, to: sh.hw * 0.7, sign: -1 };
  const t = {};
  const tilts = [];
  for (const [k, sd] of Object.entries(sides)) {
    t[k] = edgeAt(sd.point, sd.half, sd.from, sd.to) ?? 0;
    const mid = (sd.from + sd.to) / 2;
    const qa = edgeAt(sd.point, sd.half, sd.from, mid - (sd.to - sd.from) * 0.05);
    const qb = edgeAt(sd.point, sd.half, mid + (sd.to - sd.from) * 0.05, sd.to);
    if (qa !== null && qb !== null) tilts.push(sd.sign * Math.atan2(qb - qa, (sd.to - sd.from) * 0.55) * (180 / Math.PI));
  }
  tilts.sort((p, q) => p - q);
  const tilt = tilts.length >= 2 ? Math.max(-3, Math.min(3, (tilts[(tilts.length - 1) >> 1] + tilts[tilts.length >> 1]) / 2)) : null;
  const u0 = sh.uc - sh.hw - t.L;
  const u1 = sh.uc + sh.hw + t.R;
  const v0 = sh.vc - sh.hh - (t.T ?? 0);
  const v1 = sh.vc + sh.hh + t.B;
  const next = { ...sh, uc: (u0 + u1) / 2, hw: (u1 - u0) / 2, vc: (v0 + v1) / 2, hh: (v1 - v0) / 2, snap: [t.L, t.R, t.T ?? 0, t.B].map((x) => Math.round(x)) };
  return { next, tilt };
}

// How far the fitted sides are from square, at most, in degrees.
function quadSkew(sh) {
  const ang = sh.lines.map(([nx, ny]) => (Math.atan2(ny, nx) * 180) / Math.PI);
  const want = [180, -90, 0, 90];
  return Math.max(...ang.map((a, i) => Math.abs(((a - want[i] + 540) % 360) - 180)));
}

// Corners of four lines (n·p = off, outward normals) taken in order L, T, R, B.
function quadCorners(lines) {
  const meet = ([a1, b1, c1], [a2, b2, c2]) => {
    const det = a1 * b2 - a2 * b1 || 1e-9;
    return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
  };
  return [meet(lines[0], lines[1]), meet(lines[1], lines[2]), meet(lines[2], lines[3]), meet(lines[3], lines[0])];
}

// Gives every side of a snapped rectangle its own straight line, fitted
// through the edge measured every few pixels along it. Stray points (a
// flower or tape over the edge) are dropped, so the hole ends up exactly the
// four-sided shape the art shows, even when the drawn frame is a little skewed.
function fitSides(sh, distAt, jump, W, H) {
  const at = (lu, lv) => {
    const u = sh.uc + lu;
    const v = sh.vc + lv;
    const x = Math.round(u * sh.c - v * sh.s);
    const y = Math.round(u * sh.s + v * sh.c);
    return x < 0 || y < 0 || x >= W || y >= H ? 999 : distAt(x, y);
  };
  const sides = [
    // [point on the side at offset n out from the centre, position a along it], outward normal, half size
    { name: "L", p: (n, a) => [-n, a], nrm: [-1, 0], half: sh.hw, len: sh.hh },
    { name: "T", p: (n, a) => [a, -n], nrm: [0, -1], half: sh.hh, len: sh.hw },
    { name: "R", p: (n, a) => [n, a], nrm: [1, 0], half: sh.hw, len: sh.hh },
    { name: "B", p: (n, a) => [a, n], nrm: [0, 1], half: sh.hh, len: sh.hw },
  ];
  const lines = [];
  for (const sd of sides) {
    const start = -Math.min(sd.half * 0.5, 40);
    const pts = [];
    for (let a = -sd.len * 0.85; a <= sd.len * 0.85; a += 6) {
      const prof = [];
      for (let t = start; t <= SNAP_MAX; t++) {
        const v = [-2, 0, 2].map((da) => at(...sd.p(sd.half + t, a + da))).sort((p, q) => p - q);
        prof.push(v[1]);
      }
      const base = [...prof.slice(0, 8)].sort((p, q) => p - q)[4];
      for (let k = 1; k < prof.length; k++)
        if (prof[k] > base + jump) {
          const lo = prof[k - 1];
          pts.push([a, start + k - 1 + Math.min(1, Math.max(0, (base + jump - lo) / (prof[k] - lo || 1)))]);
          break;
        }
    }
    // Theil-Sen line t = m*a + b, then least squares on the points near it.
    let m = 0;
    let b = 0;
    let ok = false;
    if (pts.length >= 8) {
      const slopes = [];
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j += 2) if (pts[j][0] - pts[i][0] > 20) slopes.push((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]));
      slopes.sort((p, q) => p - q);
      m = slopes[slopes.length >> 1] ?? 0;
      const icp = pts.map(([a, t]) => t - m * a).sort((p, q) => p - q);
      b = icp[icp.length >> 1];
      const near = pts.filter(([a, t]) => Math.abs(t - (m * a + b)) < 3);
      if (near.length >= Math.max(8, pts.length * 0.4)) {
        const n = near.length;
        const ma = near.reduce((s, p) => s + p[0], 0) / n;
        const mt = near.reduce((s, p) => s + p[1], 0) / n;
        const sxx = near.reduce((s, p) => s + (p[0] - ma) ** 2, 0);
        const sxy = near.reduce((s, p) => s + (p[0] - ma) * (p[1] - mt), 0);
        m = sxx ? sxy / sxx : 0;
        b = mt - m * ma;
        ok = Math.abs(m) < Math.tan((4 * Math.PI) / 180);
      }
    }
    if (!ok) {
      m = 0;
      b = 0;
    }
    // Two points of the side's line, in the shape's own axes.
    const P1 = sd.p(sd.half + b + m * -sd.len, -sd.len);
    const P2 = sd.p(sd.half + b + m * sd.len, sd.len);
    let nx = -(P2[1] - P1[1]);
    let ny = P2[0] - P1[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (nx * sd.nrm[0] + ny * sd.nrm[1] < 0) (nx = -nx), (ny = -ny);
    lines.push([nx, ny, nx * P1[0] + ny * P1[1]]);
  }
  const corners = quadCorners(lines);
  const hw = Math.max(...corners.map((p) => Math.abs(p[0])));
  const hh = Math.max(...corners.map((p) => Math.abs(p[1])));
  return { ...sh, kind: "quad", lines, corners, hw, hh };
}

// Sets a pixel if any pixel within r of it is set (outside the picture counts as unset).
function dilate(mask, w, h, r) {
  const rows = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let d = -r; d <= r && !on; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < w && mask[y * w + xx]) on = 1;
      }
      rows[y * w + x] = on;
    }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let d = -r; d <= r && !on; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < h && rows[yy * w + x]) on = 1;
      }
      out[y * w + x] = on;
    }
  return out;
}

// Turns a clean shape into hole coverage (0..1) over its bounding box, minus
// anything that lies across the window in the art.
function cutShape(sh, grow, { winAt, nearAt, distAt, busyAt, otherAt }, W, H) {
  const ext = Math.max(sh.hw, sh.hh) * 1.5 + grow + 3;
  const ccx = sh.uc * sh.c - sh.vc * sh.s;
  const ccy = sh.uc * sh.s + sh.vc * sh.c;
  const X0 = Math.max(0, Math.floor(ccx - ext));
  const Y0 = Math.max(0, Math.floor(ccy - ext));
  const X1 = Math.min(W - 1, Math.ceil(ccx + ext));
  const Y1 = Math.min(H - 1, Math.ceil(ccy + ext));
  const rw = X1 - X0 + 1;
  const rh = Y1 - Y0 + 1;
  const cover = new Float32Array(rw * rh);
  const sd = new Float32Array(rw * rh);
  const other = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const px = X0 + x + 0.5;
      const py = Y0 + y + 0.5;
      const d = sdShape(sh, px * sh.c + py * sh.s - sh.uc, -px * sh.s + py * sh.c - sh.vc) - grow;
      const j = y * rw + x;
      sd[j] = d;
      cover[j] = Math.min(1, Math.max(0, 0.5 - d));
    }
  // Window paper: the window's own pixels, spread through every paper-coloured
  // pixel connected to them inside the shape (between petals, up to the edge).
  const paper = new Uint8Array(rw * rh);
  const queue = new Int32Array(rw * rh);
  let qt = 0;
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const j = y * rw + x;
      if (sd[j] < 0 && winAt(X0 + x, Y0 + y)) (paper[j] = 1), (queue[qt++] = j);
    }
  for (let qh = 0; qh < qt; qh++) {
    const j = queue[qh];
    const x = j % rw;
    for (const k of [x > 0 ? j - 1 : -1, x < rw - 1 ? j + 1 : -1, j - rw, j + rw]) {
      if (k < 0 || k >= rw * rh || paper[k] || sd[k] >= 0) continue;
      if (nearAt(X0 + (k % rw), Y0 + Math.floor(k / rw))) (paper[k] = 1), (queue[qt++] = k);
    }
  }
  for (let j = 0; j < rw * rh; j++) if (sd[j] < 0 && !paper[j]) other[j] = 1;
  // Not window paper but inside the shape: thin slivers along the edge are
  // paper shading; a blob reaching deep in from outside is an object on top.
  const solid = dilate(erode(other, rw, rh, OPEN), rw, rh, OPEN);
  const keep = new Uint8Array(rw * rh);
  let kept = 0;
  for (const px of components(solid, rw, rh, 1)) {
    let deepest = 0;
    let nearEdge = false;
    let busy = 0;
    let frame = false;
    const dists = [];
    for (const j of px) {
      if (-sd[j] > deepest) deepest = -sd[j];
      if (sd[j] > -grow - 3) nearEdge = true;
      const x = X0 + (j % rw);
      const y = Y0 + Math.floor(j / rw);
      if (busyAt(x, y)) busy++;
      if (!frame && otherAt(x, y)) frame = true;
      if (j % 3 === 0) dists.push(distAt(x, y));
    }
    if (!nearEdge || deepest < OCCLUDER_DEPTH) continue;
    // Smooth, paper-coloured patches are shading on the window itself: cut
    // them. Tape, pegs, flowers and other frames stay on top.
    dists.sort((a, b) => a - b);
    const object = frame || (dists[dists.length >> 1] ?? 0) > OCCLUDER_COLOUR || busy / px.length > OCCLUDER_TEXTURE;
    if (object) for (const j of px) keep[j] = 1;
  }
  // The opening only decides what is an object; its real outline comes back
  // from the unopened pixels around it.
  const around = dilate(keep, rw, rh, OPEN + 1);
  for (let j = 0; j < rw * rh; j++) {
    keep[j] = around[j] && other[j] ? 1 : 0;
    kept += keep[j];
  }
  if (kept) {
    // Soften the object's outline by a pixel, then keep it out of the hole.
    for (let y = 1; y < rh - 1; y++)
      for (let x = 1; x < rw - 1; x++) {
        const j = y * rw + x;
        let k = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) k += keep[j + dy * rw + dx];
        if (k) cover[j] *= 1 - k / 9;
      }
  }
  return { X0, Y0, rw, rh, cover, kept };
}

function boxBlur(f, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += f[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1);
      acc += f[y * w + Math.min(w - 1, x + r + 1)] - f[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

// A window that is no simple shape (a scalloped arch): its own outline,
// cleaned of specks, grown a little and smoothed to an anti-aliased edge.
function cutFree(win, rw, rh, X0, Y0, grow) {
  let m = dilate(erode(win, rw, rh, 2), rw, rh, 2);
  m = erode(dilate(m, rw, rh, 2), rw, rh, 2);
  if (grow) m = dilate(m, rw, rh, grow);
  let f = Float32Array.from(m);
  f = boxBlur(boxBlur(f, rw, rh, 2), rw, rh, 2);
  const cover = new Float32Array(rw * rh);
  for (let j = 0; j < rw * rh; j++) cover[j] = Math.min(1, Math.max(0, (f[j] - 0.5) * 2.5 + 0.5));
  return { X0, Y0, rw, rh, cover, kept: 0 };
}

// The shape's outline pushed out by `by` px, as a polygon in picture coordinates.
function shapeOutline(sh, by) {
  const hw = sh.hw + by;
  const hh = sh.hh + by;
  let local;
  if (sh.kind === "quad") {
    local = quadCorners(sh.lines.map(([nx, ny, off]) => [nx, ny, off + by]));
  } else if (sh.kind === "rect") {
    local = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ];
  } else if (sh.kind === "arch") {
    const R = sh.hw + by;
    const cy = -sh.hh + sh.hw;
    local = [[-hw, hh]];
    for (let k = 0; k <= 12; k++) {
      const t = Math.PI - (k / 12) * Math.PI;
      local.push([R * Math.cos(t), cy - R * Math.sin(t)]);
    }
    local.push([hw, hh]);
  } else {
    local = Array.from({ length: 24 }, (_, k) => {
      const t = (k / 24) * Math.PI * 2;
      return [hw * Math.cos(t), hh * Math.sin(t)];
    });
  }
  return local.map(([lu, lv]) => {
    const u = sh.uc + lu;
    const v = sh.vc + lv;
    return [Math.round(u * sh.c - v * sh.s), Math.round(u * sh.s + v * sh.c)];
  });
}

// ---------- window outlines ----------

// Convex hull (monotone chain) of [x, y] points.
function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Drops hull corners that sit within `eps` px of the line through their neighbours.
function simplify(poly, eps) {
  let out = poly;
  let changed = true;
  while (changed && out.length > 4) {
    changed = false;
    for (let i = 0; i < out.length && out.length > 4; i++) {
      const a = out[(i - 1 + out.length) % out.length];
      const b = out[i];
      const c = out[(i + 1) % out.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      const d = Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / len;
      if (d < eps) {
        out = out.slice(0, i).concat(out.slice(i + 1));
        changed = true;
        i--;
      }
    }
  }
  return out;
}

// Pushes every corner `by` px away from the centre, so the clip never shaves the window.
function expand(poly, by) {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [Math.round(x + ((x - cx) / d) * by), Math.round(y + ((y - cy) / d) * by)];
  });
}

function insidePoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- one template ----------

async function build(id, file, format) {
  const { w: W, h: H } = SIZE[format];
  const rgba = await sharp(file).resize(W, H, { fit: "cover", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();

  // Look for flat regions on a half-size copy (fast and ignores fine grain).
  const hw = W / 2;
  const hh = H / 2;
  const half = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).resize(hw, hh).removeAlpha().raw().toBuffer();
  const grey = new Float32Array(hw * hh);
  for (let i = 0; i < hw * hh; i++) grey[i] = 0.299 * half[i * 3] + 0.587 * half[i * 3 + 1] + 0.114 * half[i * 3 + 2];
  const std = localStd(grey, hw, hh, 3);
  const flat = new Uint8Array(hw * hh);
  for (let i = 0; i < hw * hh; i++) flat[i] = std[i] < FLAT_STD ? 1 : 0;
  const core = erode(flat, hw, hh, ERODE);

  const want = manifest[id]?.photos ?? 0;
  // Optional per-template tuning in templates.json: { "colour": 40, "reach": 10, "grow": 3, "inset": 14 }
  const tune = manifest[id]?.tune ?? {};
  const colourDist = tune.colour ?? COLOUR_DIST;
  const grow = tune.grow ?? GROW;
  const found = components(core, hw, hh, MIN_AREA * hw * hh * 0.7)
    .map((px) => ({ px, box: bbox(px, hw) }))
    .filter(({ px, box }) => {
      const touches = box.x0 <= 1 || box.y0 <= 1 || box.x1 >= hw - 2 || box.y1 >= hh - 2;
      const aspect = box.w / box.h;
      return !touches && aspect > 0.3 && aspect < 3.2 && px.length / (box.w * box.h) > 0.45;
    })
    .sort((a, b) => b.px.length - a.px.length);
  const picked = want ? found.slice(0, want) : found;

  const slots = [];
  const full = new Uint8Array(W * H);
  const cover = new Float32Array(W * H);
  // Fine texture at full size: blank paper is flatter than any frame around it.
  const greyFull = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) greyFull[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  const texture = localStd(greyFull, W, H, 2);
  const fitted = [];
  for (const { px, box } of picked) {
    // Window colour: median of its pixels.
    const rs = [];
    const gs = [];
    const bs = [];
    for (let k = 0; k < px.length; k += 7) {
      const p = px[k];
      rs.push(half[p * 3]);
      gs.push(half[p * 3 + 1]);
      bs.push(half[p * 3 + 2]);
    }
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
    const col = [med(rs), med(gs), med(bs)];

    // Full-size region around the window.
    const pad = ((tune.reach ?? ERODE + 4) + 2) * 2;
    const X0 = Math.max(0, box.x0 * 2 - pad);
    const Y0 = Math.max(0, box.y0 * 2 - pad);
    const X1 = Math.min(W - 1, box.x1 * 2 + 1 + pad);
    const Y1 = Math.min(H - 1, box.y1 * 2 + 1 + pad);
    const rw = X1 - X0 + 1;
    const rh = Y1 - Y0 + 1;
    const allowed = new Uint8Array(rw * rh);
    const reach = (tune.reach ?? ERODE + 4) * 2;
    for (const p of px) {
      const cx = (p % hw) * 2 - X0;
      const cy = Math.floor(p / hw) * 2 - Y0;
      for (let dy = -reach; dy <= reach + 1; dy += 2)
        for (let dx = -reach; dx <= reach + 1; dx += 2) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && y >= 0 && x < rw - 1 && y < rh - 1) {
            allowed[y * rw + x] = allowed[y * rw + x + 1] = allowed[(y + 1) * rw + x] = allowed[(y + 1) * rw + x + 1] = 1;
          }
        }
    }
    const near = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        if (!allowed[y * rw + x]) continue;
        const i = ((Y0 + y) * W + X0 + x) * 4;
        const d = Math.abs(rgba[i] - col[0]) + Math.abs(rgba[i + 1] - col[1]) + Math.abs(rgba[i + 2] - col[2]);
        near[y * rw + x] = d < colourDist * 1.6 ? 1 : 0;
      }
    // Keep only the colour-matching pixels connected to the flat core.
    const win = new Uint8Array(rw * rh);
    const q = new Int32Array(rw * rh);
    let qt = 0;
    for (const p of px) {
      const x = (p % hw) * 2 - X0;
      const y = Math.floor(p / hw) * 2 - Y0;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const j = (y + dy) * rw + x + dx;
        if (near[j] && !win[j]) {
          win[j] = 1;
          q[qt++] = j;
        }
      }
    }
    for (let qh = 0; qh < qt; qh++) {
      const j = q[qh];
      const x = j % rw;
      const y = (j - x) / rw;
      for (const k of [x > 0 ? j - 1 : -1, x < rw - 1 ? j + 1 : -1, y > 0 ? j - rw : -1, y < rh - 1 ? j + rw : -1]) {
        if (k >= 0 && near[k] && !win[k]) {
          win[k] = 1;
          q[qt++] = k;
        }
      }
    }
    // Fill holes inside the window (printed words, dust) : anything the
    // region's border cannot reach without crossing the window is inside it.
    const outside = new Uint8Array(rw * rh);
    qt = 0;
    for (let x = 0; x < rw; x++)
      for (const y of [0, rh - 1]) {
        const j = y * rw + x;
        if (!win[j] && !outside[j]) (outside[j] = 1), (q[qt++] = j);
      }
    for (let y = 0; y < rh; y++)
      for (const x of [0, rw - 1]) {
        const j = y * rw + x;
        if (!win[j] && !outside[j]) (outside[j] = 1), (q[qt++] = j);
      }
    for (let qh = 0; qh < qt; qh++) {
      const j = q[qh];
      const x = j % rw;
      const y = (j - x) / rw;
      for (const k of [x > 0 ? j - 1 : -1, x < rw - 1 ? j + 1 : -1, y > 0 ? j - rw : -1, y < rh - 1 ? j + rw : -1]) {
        if (k >= 0 && !win[k] && !outside[k]) {
          outside[k] = 1;
          q[qt++] = k;
        }
      }
    }
    for (let j = 0; j < rw * rh; j++) if (!outside[j]) win[j] = 1;
    // Fit the clean shape and cut exactly that.
    const edge = [];
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        const j = y * rw + x;
        if (win[j] && (x === 0 || y === 0 || x === rw - 1 || y === rh - 1 || !win[j - 1] || !win[j + 1] || !win[j - rw] || !win[j + rw]))
          edge.push([X0 + x, Y0 + y]);
      }
    // Fit to pixels close to the paper colour (a frame of a similar shade is
    // left out), then put each side exactly on the colour step around it.
    const distAt = (x, y) => {
      const i = (y * W + x) * 4;
      return Math.abs(rgba[i] - col[0]) + Math.abs(rgba[i + 1] - col[1]) + Math.abs(rgba[i + 2] - col[2]);
    };
    const strict = Math.max(14, colourDist * 0.75);
    const fitMask = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) fitMask[y * rw + x] = win[y * rw + x] && distAt(X0 + x, Y0 + y) < strict ? 1 : 0;
    const jump = Math.min(13, Math.max(8, colourDist * 0.5));
    let sh = snapSides(fitShape(maskPoints(fitMask, rw, rh, X0, Y0), rotatedBox(edge).deg), distAt, jump, W, H);
    if (sh.kind === "rect") sh = fitSides(sh, distAt, jump, W, H);
    // Boards whose "windows" are whole cards with torn edges cut a little
    // inside the card, leaving an even paper border like a real print.
    if (tune.inset && sh.kind === "quad") {
      const lines = sh.lines.map(([nx, ny, off]) => [nx, ny, off - tune.inset]);
      sh = { ...sh, lines, corners: quadCorners(lines), hw: sh.hw - tune.inset, hh: sh.hh - tune.inset };
    }
    const winAt = (x, y) => x >= X0 && y >= Y0 && x <= X1 && y <= Y1 && win[(y - Y0) * rw + (x - X0)] === 1;
    // As flat as this window's own paper (a cream frame lying on top can match
    // the paper's colour, but never its smoothness).
    const flat = [];
    for (let j = 0; j < rw * rh; j += 5) if (win[j]) flat.push(texture[(Y0 + Math.floor(j / rw)) * W + X0 + (j % rw)]);
    flat.sort((a, b) => a - b);
    const flatLimit = Math.max(1.5, 2.5 * (flat[flat.length >> 1] ?? 1));
    const nearAt = (x, y) => distAt(x, y) < colourDist * 1.6 && texture[y * W + x] < flatLimit;
    fitted.push({ sh, winAt, nearAt, distAt, free: sh.kind === "free" ? { win, rw, rh, X0, Y0, edge } : null });
  }

  // Second pass: cut each window, knowing where all the others are. Where
  // another window shows inside this one's shape, that frame lies on top.
  const busyAt = (x, y) => std[Math.min(hh - 1, y >> 1) * hw + Math.min(hw - 1, x >> 1)] > BUSY_STD;
  for (const [k, { sh, winAt, nearAt, distAt, free }] of fitted.entries()) {
    const otherAt = (x, y) => fitted.some((f, i) => i !== k && f.winAt(x, y));
    const cut = free ? cutFree(free.win, free.rw, free.rh, free.X0, free.Y0, grow) : cutShape(sh, grow, { winAt, nearAt, distAt, busyAt, otherAt }, W, H);
    const samples = [];
    let area = 0;
    for (let y = 0; y < cut.rh; y++)
      for (let x = 0; x < cut.rw; x++) {
        const c = cut.cover[y * cut.rw + x];
        if (!c) continue;
        const i = (cut.Y0 + y) * W + cut.X0 + x;
        if (c > cover[i]) cover[i] = c;
        if (c > 0.5) {
          area++;
          if (x % 6 === 0 && y % 6 === 0) samples.push([cut.X0 + x, cut.Y0 + y]);
        }
      }
    // The photo's box (and, for an outline cut, its turn) around the hole.
    const box = free ? rotatedBox(free.edge) : null;
    const cx = free ? box.cx : sh.uc * sh.c - sh.vc * sh.s;
    const cy = free ? box.cy : sh.uc * sh.s + sh.vc * sh.c;
    const bw = free ? box.w + 2 * (grow + MARGIN) : 2 * (sh.hw + grow + MARGIN);
    const bh = free ? box.h + 2 * (grow + MARGIN) : 2 * (sh.hh + grow + MARGIN);
    const rot = free ? box.rotate : Math.round(sh.deg * 100) / 100;
    slots.push({
      // Each photo is clipped to this outline, so a photo never shows inside a
      // neighbouring window where two frames overlap in the art.
      clip: free ? expand(simplify(convexHull(free.edge), 1), grow + 4) : shapeOutline(sh, grow + 2),
      samples,
      x: Math.round(cx - bw / 2),
      y: Math.round(cy - bh / 2),
      w: Math.round(bw),
      h: Math.round(bh),
      rotate: Math.abs(rot) < 0.05 ? 0 : rot,
      area,
      fit: `${free ? "outline" : sh.kind} ${(sh.iou * 100).toFixed(1)}%${sh.corners ? ` skew ${quadSkew(sh).toFixed(1)}°` : ""}${cut.kept ? ` +${cut.kept}px on top` : ""}`,
    });
  }

  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    alpha[i] = Math.round(255 * (1 - cover[i]));
    full[i] = cover[i] > 0.5 ? 1 : 0;
  }
  const cut = Buffer.from(rgba);
  for (let i = 0; i < W * H; i++) cut[i * 4 + 3] = alpha[i];

  await sharp(cut, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100, effort: 5 })
    .toFile(path.join(OUT, `${id}__${format}.webp`));
  await sharp(cut, { raw: { width: W, height: H, channels: 4 } })
    .flatten({ background: "#e9e0cd" })
    .resize(Math.round(W / 4))
    .webp({ quality: 80 })
    .toFile(path.join(OUT, `${id}__${format}.thumb.webp`));

  // Reading order: top to bottom, then left to right within a row.
  slots.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows = [];
  for (const s of slots) {
    const row = rows.find((r) => {
      const top = Math.max(r.top, s.y);
      const bottom = Math.min(r.bottom, s.y + s.h);
      return bottom - top > 0.5 * Math.min(r.bottom - r.top, s.h);
    });
    if (row) {
      row.items.push(s);
      row.top = Math.min(row.top, s.y);
      row.bottom = Math.max(row.bottom, s.y + s.h);
    } else rows.push({ top: s.y, bottom: s.y + s.h, items: [s] });
  }
  slots.splice(0, slots.length, ...rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x)));
  const biggest = slots.reduce((m, s) => (s.area > m.area ? s : m), slots[0]);

  // Stacking: if window B pokes into A's outline, B's photo is drawn after A's.
  const after = slots.map(() => new Set());
  slots.forEach((a, i) =>
    slots.forEach((b, j) => {
      if (i !== j && b.samples.filter(([x, y]) => insidePoly(a.clip, x, y)).length > 3) after[j].add(i);
    }),
  );
  const z = new Array(slots.length).fill(-1);
  for (let level = 0, placed = 0; placed < slots.length; level++) {
    const ready = slots.map((_, j) => j).filter((j) => z[j] < 0 && [...after[j]].every((i) => z[i] >= 0 && z[i] < level));
    const pick = ready.length ? ready : [z.findIndex((v) => v < 0)]; // a cycle: just place one
    for (const j of pick) z[j] = level;
    placed += pick.length;
  }
  let clash = 0;
  slots.forEach((b, j) =>
    slots.forEach((a, i) => {
      if (i !== j && z[i] > z[j]) clash += b.samples.filter(([x, y]) => insidePoly(a.clip, x, y)).length;
    }),
  );
  if (clash) console.log(`WARN ${id}__${format}: ${clash * 36} px of a window would show a neighbour's photo`);

  const outSlots = slots.map((s, i) => ({
    id: `s${i}`,
    x: s.x,
    y: s.y,
    w: s.w,
    h: s.h,
    ...(s.rotate ? { rotate: s.rotate } : {}),
    clip: s.clip,
    z: z[i],
    role: s === biggest ? "hero" : "any",
  }));

  // Debug sheet: windows tinted pink, photo boxes in red, numbered.
  const dbg = Buffer.from(rgba);
  for (let i = 0; i < W * H; i++)
    if (full[i]) {
      dbg[i * 4] = (dbg[i * 4] + 255) >> 1;
      dbg[i * 4 + 1] = dbg[i * 4 + 1] >> 1;
      dbg[i * 4 + 2] = (dbg[i * 4 + 2] + 255) >> 1;
    }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${outSlots
    .map(
      (s, i) =>
        `<g transform="rotate(${s.rotate ?? 0} ${s.x + s.w / 2} ${s.y + s.h / 2})"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="red" stroke-width="5"/></g><text x="${s.x + s.w / 2}" y="${s.y + s.h / 2}" font-size="90" font-family="Arial" font-weight="bold" fill="red" text-anchor="middle">${i + 1}</text>`,
    )
    .join("")}</svg>`;
  const marked = await sharp(dbg, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
  await sharp(marked).resize(540).png().toFile(path.join(DEBUG, `${id}__${format}.png`));

  const ok = !want || outSlots.length === want;
  console.log(`${ok ? "ok  " : "WARN"} ${id}__${format}: ${outSlots.length}${want ? `/${want}` : ""} windows`);
  for (const [i, s] of slots.entries()) console.log(`       ${i + 1}. ${outSlots[i].w}x${outSlots[i].h}${outSlots[i].rotate ? `@${outSlots[i].rotate}°` : ""} ${s.fit}`);
  return { id, name: manifest[id]?.name ?? id, format, src: `/templates/${id}__${format}.webp`, thumb: `/templates/${id}__${format}.thumb.webp`, w: W, h: H, slots: outSlots };
}

// ---------- all of them ----------

const only = process.argv[2];
const files = fs
  .readdirSync(ORIGINALS)
  .filter((f) => /__(story|post)\.(webp|png|jpe?g)$/i.test(f))
  .filter((f) => !only || f.startsWith(only + "__"));

const previous = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : [];
const index = only ? previous.filter((e) => e.id !== only) : [];
for (const f of files) {
  const [, id, format] = /^(.+)__(story|post)\./.exec(f);
  index.push(await build(id, path.join(ORIGINALS, f), format));
}
index.sort((a, b) => Object.keys(manifest).indexOf(a.id) - Object.keys(manifest).indexOf(b.id) || a.format.localeCompare(b.format));
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + "\n");
console.log(`wrote ${INDEX} (${index.length} templates)`);
