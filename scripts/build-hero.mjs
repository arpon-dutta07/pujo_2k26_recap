// Photos for the floating polaroids around the prodip on the home page.
//
//   moodboard/hero/<name>.(jpg|jpeg|png|webp)   Pujo photos (pandal, thakur)
//   moodboard/hero.json                        optional, per photo:
//     "<name>": "বাগবাজার"                       just a caption, or
//     "<name>": {
//       "caption": "রাঁচি",
//       "crops": [{ "zoom": 1 }, { "zoom": 2.4, "x": 0.53, "y": 0.7 }],
//       "credit": { "author", "license", "licenseUrl", "page" }
//     }
//
// Each crop becomes one card: zoom 1 fills the card window with the whole
// photo, a higher zoom goes closer, centred on (x, y) as fractions of the
// photo. With no x/y the most interesting part is kept. Cards go out first
// crop of every photo, then second crop of every photo, so neighbours differ.
// Writes public/hero/<n>.webp and src/three/hero.generated.json (cards and
// photo credits for the home page). Run: npm run hero
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false); // Windows keeps cached files locked otherwise

const SRC = "moodboard/hero";
const CONFIG = "moodboard/hero.json";
const OUT = "public/hero";
const INDEX = "src/three/hero.generated.json";
// The card's photo window (src/three/textures.ts), at 2x.
const W = 456;
const H = 424;

const config = fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, "utf8")) : {};
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".webp")) fs.unlinkSync(path.join(OUT, f));

const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
const photos = files.map((f) => {
  const name = f.replace(/\.(jpe?g|png|webp)$/i, "");
  const c = typeof config[name] === "string" ? { caption: config[name] } : config[name] ?? {};
  return { file: f, name, caption: c.caption ?? null, crops: c.crops?.length ? c.crops : [{ zoom: 1 }], credit: c.credit ?? null };
});

async function cut(buf, crop) {
  const zoom = crop.zoom ?? 1;
  if (crop.x == null && zoom === 1) {
    return sharp(buf).resize(W, H, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 82 }).toBuffer();
  }
  const { width, height } = await sharp(buf).metadata();
  const k = Math.max(W / width, H / height) * zoom;
  const cw = Math.min(width, Math.round(W / k));
  const ch = Math.min(height, Math.round(H / k));
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  const left = clamp((crop.x ?? 0.5) * width - cw / 2, width - cw);
  const top = clamp((crop.y ?? 0.5) * height - ch / 2, height - ch);
  return sharp(buf).extract({ left, top, width: cw, height: ch }).resize(W, H, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
}

const cards = [];
const most = Math.max(0, ...photos.map((p) => p.crops.length));
for (let k = 0; k < most; k++) {
  for (const p of photos) {
    if (!p.crops[k]) continue;
    // Turned upright first, as the phone shot it.
    const upright = await sharp(fs.readFileSync(path.join(SRC, p.file))).rotate().toBuffer();
    const out = `${String(cards.length + 1).padStart(2, "0")}.webp`;
    fs.writeFileSync(path.join(OUT, out), await cut(upright, p.crops[k]));
    cards.push({ src: `/hero/${out}`, label: p.crops[k].caption ?? p.caption });
  }
}

const credits = photos.filter((p) => p.credit).map((p) => p.credit);
fs.writeFileSync(INDEX, JSON.stringify({ cards, credits }, null, 2) + "\n");
console.log(`wrote ${cards.length} hero cards from ${photos.length} photos to ${OUT}`);
