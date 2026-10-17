// Verifies a processed template against moodboard/templates.json and adds to VERIFIED
import fs from "node:fs";
import { execSync } from "node:child_process";

const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/verify-template.mjs <template_id>");
  process.exit(1);
}

const MANIFEST = "moodboard/templates.json";
const INDEX = "src/editor/templates.generated.json";
const TEMPLATES_TS = "src/editor/templates.ts";

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
if (!manifest[id]) {
  console.error(`Template ${id} not found in ${MANIFEST}`);
  process.exit(1);
}

const expectedPhotos = manifest[id].photos;
console.log(`Verifying ${id} (expected ${expectedPhotos} photos)...`);

// 1. Run build-templates for this id
execSync(`node scripts/build-templates.mjs ${id}`, { stdio: "inherit" });

// 2. Check slot count in templates.generated.json
const generated = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const entry = generated.find((e) => e.id === id && e.format === "story");

if (!entry) {
  console.error(`Error: ${id}__story not found in ${INDEX}`);
  process.exit(1);
}

if (entry.slots.length !== expectedPhotos) {
  console.error(`Window count mismatch for ${id}__story: expected ${expectedPhotos}, found ${entry.slots.length}`);
  console.error(`Check moodboard/debug/${id}__story.png to see detected windows.`);
  process.exit(1);
}

console.log(`ok: ${id}__story has exactly ${expectedPhotos} windows.`);

// 3. Add to VERIFIED in src/editor/templates.ts
let content = fs.readFileSync(TEMPLATES_TS, "utf8");
const tag = `"${id}__story"`;
if (!content.includes(tag)) {
  content = content.replace(
    /(const VERIFIED = new Set\(\[)([\s\S]*?)(\]\);)/,
    (_, start, list, end) => {
      const trimmed = list.trimEnd();
      return `${start}${trimmed}\n  ${tag},\n${end}`;
    }
  );
  fs.writeFileSync(TEMPLATES_TS, content, "utf8");
  console.log(`Added ${tag} to VERIFIED in ${TEMPLATES_TS}`);
} else {
  console.log(`${tag} is already in VERIFIED.`);
}

// 4. Run build
console.log("Running npm run build...");
execSync("npm run build", { stdio: "inherit" });
console.log(`\nAll checks passed for ${id}!`);
