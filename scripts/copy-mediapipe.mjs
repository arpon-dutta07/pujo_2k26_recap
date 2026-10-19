// Copies the MediaPipe WASM runtime into public/ so the site never needs a CDN.
// Runs on `npm install` (postinstall).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "mediapipe", "wasm");

if (!existsSync(from)) {
  console.warn("[copy-mediapipe] @mediapipe/tasks-vision is not installed yet, skipping.");
  process.exit(0);
}

// Only the classic loader is used (SIMD build, plus the no-SIMD fallback for old phones);
// the *_module_* variants would add 11 MB to every deploy for nothing.
mkdirSync(to, { recursive: true });
for (const file of readdirSync(from)) {
  if (file.includes("_module_")) continue;
  cpSync(join(from, file), join(to, file));
}
console.log(`[copy-mediapipe] copied ${readdirSync(to).length} files to public/mediapipe/wasm`);
