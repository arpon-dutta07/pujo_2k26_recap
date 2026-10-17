// Turns generated sticker pictures into studio stickers.
//
//   moodboard/stickers/<name>.(png|jpg|webp)   one sticker, or a whole sheet of
//                                              them, on flat pure green (#00FF00)
//   moodboard/stickers.json                    optional: { "<name>": { "group": "ফুল-পাতা",
//                                              "names": ["জবা", "পদ্ম", ...] } }
//                                              names in reading order
//
// The green is removed (only where it touches the outside or is pure key
// green, so green leaves inside a sticker survive), every separate sticker on
// a sheet is cut out on its own, trimmed and written as:
//
//   public/stickers/<name>-<n>.webp
//   src/editor/stickers.generated.json
//   moodboard/debug/stickers__<name>.png     check sheet with numbered boxes
//
// Run: npm run stickers
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "moodboard/stickers";
const MANIFEST = "moodboard/stickers.json";
const OUT = "public/stickers";
const DEBUG = "moodboard/debug";
const INDEX = "src/editor/stickers.generated.json";
const MAX_SIDE = 640; // px, longest side of a finished sticker
const MIN_AREA = 0.002; // a sticker covers at least 0.2% of its sheet
const MERGE = 0.012; // pieces closer than this (share of sheet width) are one sticker

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DEBUG, { recursive: true });

// How "key green" a pixel is: 0 = not green at all, 1 = pure #00FF00.
const keyness = (r, g, b) => Math.max(0, (g - Math.max(r, b)) / 255);

function backgroundMask(px, w, h) {
  const n = w * h;
  const k = new Float32Array(n);
  for (let i = 0; i < n; i++) k[i] = keyness(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  const bg = new Uint8Array(n);
  const q = new Int32Array(n);
  let t = 0;
  const seed = (i) => {
    if (!bg[i] && k[i] > 0.35 && px[i * 4 + 1] > 110) {
      bg[i] = 1;
      q[t++] = i;
    }
  };
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x);
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1);
  for (let hd = 0; hd < t; hd++) {
    const i = q[hd];
    const x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < n - w) seed(i + w);
  }
  // Enclosed holes (a jhumka ring, the gap in a handle) only when clearly key green.
  for (let i = 0; i < n; i++) if (!bg[i] && k[i] > 0.6 && px[i * 4 + 1] > 170) bg[i] = 1;
  return { bg, k };
}

// Components of the sticker mask on a quarter-size grid, after growing it a
// little so the parts of one sticker (a flame, a tassel) stay together.
function pieces(bg, w, h) {
  const s = 4;
  const gw = Math.ceil(w / s);
  const gh = Math.ceil(h / s);
  const grid = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!bg[y * w + x]) grid[Math.floor(y / s) * gw + Math.floor(x / s)] = 1;
  const r = Math.max(1, Math.round((MERGE * w) / s));
  const grown = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      if (!grid[y * gw + x]) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && dx * dx + dy * dy <= r * r) grown[yy * gw + xx] = 1;
        }
    }
  const label = new Int32Array(gw * gh).fill(-1);
  const out = [];
  const q = new Int32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) {
    if (!grown[i] || label[i] >= 0) continue;
    const id = out.length;
    let t = 0;
    q[t++] = i;
    label[i] = id;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -1;
    let y1 = -1;
    let area = 0;
    for (let hd = 0; hd < t; hd++) {
      const p = q[hd];
      const x = p % gw;
      const y = (p - x) / gw;
      if (grid[p]) {
        area++;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      for (const nb of [x > 0 ? p - 1 : -1, x < gw - 1 ? p + 1 : -1, y > 0 ? p - gw : -1, y < gh - 1 ? p + gw : -1]) {
        if (nb >= 0 && grown[nb] && label[nb] < 0) {
          label[nb] = id;
          q[t++] = nb;
        }
      }
    }
    out.push({ id, area: area * s * s, box: { x0: x0 * s, y0: y0 * s, x1: Math.min(w - 1, x1 * s + s - 1), y1: Math.min(h - 1, y1 * s + s - 1) } });
  }
  return { list: out.filter((p) => p.area >= MIN_AREA * w * h), label, gw, s };
}

function readingOrder(list) {
  const sorted = [...list].sort((a, b) => a.box.y0 + a.box.y1 - (b.box.y0 + b.box.y1));
  const rows = [];
  for (const p of sorted) {
    const row = rows.find((r) => Math.min(r.y1, p.box.y1) - Math.max(r.y0, p.box.y0) > 0.4 * Math.min(r.y1 - r.y0, p.box.y1 - p.box.y0));
    if (row) {
      row.items.push(p);
      row.y0 = Math.min(row.y0, p.box.y0);
      row.y1 = Math.max(row.y1, p.box.y1);
    } else rows.push({ y0: p.box.y0, y1: p.box.y1, items: [p] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.box.x0 - b.box.x0));
}

async function build(file) {
  const base = path.basename(file).replace(/\.(png|jpe?g|webp)$/i, "");
  const meta = await sharp(file).metadata();
  const scale = Math.min(1, 3000 / Math.max(meta.width, meta.height));
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const px = await sharp(file).resize(w, h).ensureAlpha().raw().toBuffer();
  const { bg, k } = backgroundMask(px, w, h);
  const { list, label, gw, s } = pieces(bg, w, h);
  const ordered = readingOrder(list);
  const info = manifest[base] ?? {};
  const made = [];

  for (let n = 0; n < ordered.length; n++) {
    const p = ordered[n];
    const pad = 6;
    const x0 = Math.max(0, p.box.x0 - pad);
    const y0 = Math.max(0, p.box.y0 - pad);
    const x1 = Math.min(w - 1, p.box.x1 + pad);
    const y1 = Math.min(h - 1, p.box.y1 + pad);
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;
    const cut = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        const i = gy * w + gx;
        const o = (y * cw + x) * 4;
        const mine = label[Math.floor(gy / s) * gw + Math.floor(gx / s)] === p.id;
        if (!mine || bg[i]) continue;
        let r = px[i * 4];
        let g = px[i * 4 + 1];
        let b = px[i * 4 + 2];
        // Next to the background: soften the edge and take the green spill out.
        const edge = (gx > 0 && bg[i - 1]) || (gx < w - 1 && bg[i + 1]) || (gy > 0 && bg[i - w]) || (gy < h - 1 && bg[i + w]);
        let a = 255;
        if (edge) a = Math.round(255 * Math.min(1, Math.max(0, 1 - (k[i] - 0.12) / 0.3)));
        if (edge || k[i] > 0.1) g = Math.min(g, Math.max(r, b) + 6);
        cut[o] = r;
        cut[o + 1] = g;
        cut[o + 2] = b;
        cut[o + 3] = a;
      }
    const id = `${base}-${n + 1}`;
    const out = await sharp(cut, { raw: { width: cw, height: ch, channels: 4 } })
      .trim({ threshold: 1 })
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 95 })
      .toBuffer({ resolveWithObject: true });
    fs.writeFileSync(path.join(OUT, `${id}.webp`), out.data);
    made.push({
      id,
      name: info.names?.[n] ?? `${info.group ?? base} ${n + 1}`,
      group: info.group ?? base,
      src: `/stickers/${id}.webp`,
      w: out.info.width,
      h: out.info.height,
      box: p.box,
    });
  }

  // Check sheet: the sheet on a grey checker with every cut boxed and numbered.
  const preview = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${made
    .map(
      (m, i) =>
        `<rect x="${m.box.x0}" y="${m.box.y0}" width="${m.box.x1 - m.box.x0}" height="${m.box.y1 - m.box.y0}" fill="none" stroke="magenta" stroke-width="${Math.max(3, w / 300)}"/><text x="${m.box.x0 + 8}" y="${m.box.y0 + w / 25}" font-size="${w / 25}" font-family="Arial" font-weight="bold" fill="magenta">${i + 1}</text>`,
    )
    .join("")}</svg>`;
  const marked = await sharp(preview).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  await sharp(marked).resize(900, 900, { fit: "inside" }).png().toFile(path.join(DEBUG, `stickers__${base}.png`));
  const expected = info.names?.length;
  console.log(`${expected && expected !== made.length ? "WARN" : "ok  "} ${base}: ${made.length} stickers${expected ? ` (names for ${expected})` : ""}`);
  return made.map(({ box, ...rest }) => rest);
}

const only = process.argv[2];
const files = fs.existsSync(SRC)
  ? fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && (!only || f.startsWith(only)))
  : [];
const previous = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : [];
const rebuilt = new Set(files.map((f) => f.replace(/\.(png|jpe?g|webp)$/i, "")));
let index = only ? previous.filter((s) => !rebuilt.has(s.id.replace(/-\d+$/, ""))) : [];
if (!only) for (const f of fs.readdirSync(OUT)) if (/-\d+\.webp$/.test(f) && rebuilt.has(f.replace(/-\d+\.webp$/, ""))) fs.unlinkSync(path.join(OUT, f));
for (const f of files) index = index.concat(await build(path.join(SRC, f)));
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + "\n");
console.log(`wrote ${INDEX} (${index.length} stickers)`);
