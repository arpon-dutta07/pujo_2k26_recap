// Downloads Google's official MediaPipe Face Landmarker model (Apache-2.0) into public/.
// Only needed once; the file is committed so deploys never depend on Google's bucket.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "mediapipe", "face_landmarker.task");

if (existsSync(out) && !process.argv.includes("--force")) {
  console.log("[fetch-model] already present:", out);
  process.exit(0);
}

const res = await fetch(MODEL_URL);
if (!res.ok) throw new Error(`[fetch-model] HTTP ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log(`[fetch-model] saved ${(buf.length / 1024 / 1024).toFixed(2)} MB to public/mediapipe/`);
