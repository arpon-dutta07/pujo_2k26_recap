// Small see-through copies of the moodboard templates for the home page,
// where a dozen of them show at card size with sample photos in the windows.
// The full ones are about 450 KB each; these are about 50 KB.
//
//   public/templates/<id>__story.webp  ->  public/templates/small/<id>.webp
//
// Runs after `npm run templates`. Run alone: node scripts/build-template-previews.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);

const SRC = "public/templates";
const OUT = "public/templates/small";
const WIDTH = 360;

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".webp")) fs.unlinkSync(path.join(OUT, f));

const files = fs.readdirSync(SRC).filter((f) => /__story\.webp$/.test(f));
let bytes = 0;
for (const f of files) {
  const id = f.replace(/__story\.webp$/, "");
  const buf = await sharp(fs.readFileSync(path.join(SRC, f)))
    .resize({ width: WIDTH })
    .webp({ quality: 70, alphaQuality: 80, effort: 6 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
  bytes += buf.length;
}
console.log(`wrote ${files.length} previews to ${OUT} (${Math.round(bytes / 1024)} KB)`);
