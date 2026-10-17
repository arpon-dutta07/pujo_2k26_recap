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
  return { cx, cy, w: best.u1 - best.u0 + 1, h: best.v1 - best.v0 + 1, rotate };
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
  // Optional per-template tuning in templates.json: { "colour": 40, "reach": 10, "grow": 3 }
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

  const alpha = new Uint8Array(W * H).fill(255);
  const slots = [];
  const full = new Uint8Array(W * H);
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
    // Grow a little so the soft edge between paper and frame disappears.
    let grown = win;
    for (let g = 0; g < grow; g++) {
      const next = grown.slice();
      for (let y = 1; y < rh - 1; y++)
        for (let x = 1; x < rw - 1; x++) {
          const j = y * rw + x;
          if (!grown[j] && (grown[j - 1] || grown[j + 1] || grown[j - rw] || grown[j + rw])) next[j] = 1;
        }
      grown = next;
    }
    const edge = [];
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        const j = y * rw + x;
        if (!grown[j]) continue;
        full[(Y0 + y) * W + X0 + x] = 1;
        const isEdge = x === 0 || y === 0 || x === rw - 1 || y === rh - 1 || !grown[j - 1] || !grown[j + 1] || !grown[j - rw] || !grown[j + rw];
        if (isEdge) edge.push([X0 + x, Y0 + y]);
      }
    const r = rotatedBox(edge);
    // Each photo is clipped to this outline, so a photo never shows inside a
    // neighbouring window where two frames overlap in the art.
    const clip = expand(simplify(convexHull(edge), 1), 4);
    const samples = [];
    for (let y = 0; y < rh; y += 6) for (let x = 0; x < rw; x += 6) if (grown[y * rw + x]) samples.push([X0 + x, Y0 + y]);
    slots.push({
      clip,
      samples,
      x: Math.round(r.cx - r.w / 2 - MARGIN),
      y: Math.round(r.cy - r.h / 2 - MARGIN),
      w: Math.round(r.w + MARGIN * 2),
      h: Math.round(r.h + MARGIN * 2),
      rotate: Math.round(r.rotate * 4) / 4,
      area: grown.reduce((a, b) => a + b, 0),
    });
  }

  // Soft one-pixel edge on the cut.
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (full[i]) alpha[i] = 0;
      else if (full[i - 1] || full[i + 1] || full[i - W] || full[i + W]) alpha[i] = 150;
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
  console.log(`${ok ? "ok  " : "WARN"} ${id}__${format}: ${outSlots.length}${want ? `/${want}` : ""} windows`, outSlots.map((s) => `${s.w}x${s.h}${s.rotate ? `@${s.rotate}°` : ""}`).join(" "));
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
