// Verifies a processed sticker sheet against moodboard/stickers.json
import fs from "node:fs";
import { execSync } from "node:child_process";

const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/verify-sticker.mjs <sheet_id>");
  process.exit(1);
}

const MANIFEST = "moodboard/stickers.json";
const INDEX = "src/editor/stickers.generated.json";

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
if (!manifest[id]) {
  console.error(`Sheet ${id} not found in ${MANIFEST}`);
  process.exit(1);
}

const expectedCount = manifest[id].names?.length ?? 9;
console.log(`Verifying sticker sheet ${id} (expected ${expectedCount} stickers)...`);

// 1. Run build-stickers for this id
execSync(`node scripts/build-stickers.mjs ${id}`, { stdio: "inherit" });

// 2. Check generated stickers count
const generated = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const cut = generated.filter((s) => s.id.startsWith(id + "-"));

if (cut.length !== expectedCount) {
  console.error(`Sticker count mismatch for ${id}: expected ${expectedCount}, cut ${cut.length}`);
  console.error(`Check moodboard/debug/stickers__${id}.png to see bounding boxes.`);
  process.exit(1);
}

console.log(`ok: ${id} has exactly ${cut.length} stickers.`);

// 3. Run build
console.log("Running npm run build...");
execSync("npm run build", { stdio: "inherit" });
console.log(`\nAll checks passed for ${id}!`);
