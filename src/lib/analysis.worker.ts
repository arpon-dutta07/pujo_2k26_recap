// The heavy half of the photo check, off the page's main thread: decoding,
// the blur and duplicate measurements, the face model and the thumbnails.
// The page only gets small results back, so the prodip, the flying cards and
// the counters keep moving however many photos come in. analyze.ts decides
// what to keep.
import { LIMITS } from "../config";
import type { WorkerIn, WorkerOut } from "./analysis-protocol";
import { readExif } from "./exif";
import { detectFaces, loadFaceModel } from "./faces";
import { decodeBitmap, drawFit, measure } from "./image";

type FaceModel = NonNullable<Awaited<ReturnType<typeof loadFaceModel>>>;

const scope = self as unknown as {
  postMessage: (m: WorkerOut, transfer?: Transferable[]) => void;
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null;
  import?: (url: string) => Promise<void>;
};
const post = (m: WorkerOut, transfer: Transferable[] = []) => scope.postMessage(m, transfer);

// MediaPipe loads its WASM glue with importScripts(), which module workers
// do not have, and then falls back to self.import(url). Run the glue as a
// classic script so its ModuleFactory ends up on self, where MediaPipe looks.
scope.import = async (url: string) => {
  const code = await (await fetch(url)).text();
  (0, eval)(`${code}\n;self.ModuleFactory = ModuleFactory;`);
};

const supported = (() => {
  try {
    return typeof OffscreenCanvas !== "undefined" && !!new OffscreenCanvas(1, 1).getContext("2d");
  } catch {
    return false;
  }
})();

const cancelled = new Set<number>();
const work = supported ? new OffscreenCanvas(1, 1) : null;
const small = supported ? new OffscreenCanvas(1, 1) : null;

function facesOf(model: FaceModel | null, image: OffscreenCanvas) {
  if (!model) return null;
  try {
    return detectFaces(model, image);
  } catch {
    return null;
  }
}

async function measureOne(bmp: ImageBitmap, model: FaceModel | null) {
  const analysis = drawFit(bmp, LIMITS.analysisSize, work!);
  const thumb = drawFit(bmp, LIMITS.thumbSize, small!);
  const { width, height } = bmp;
  bmp.close();
  const m = measure(analysis);
  const faces = facesOf(model, analysis);
  const [blob, card] = await Promise.all([thumb.convertToBlob({ type: "image/jpeg", quality: 0.8 }), createImageBitmap(thumb)]);
  return { data: { width, height, hash: m.hash, sharpness: m.sharpness, brightness: m.brightness, faces, thumb: blob }, card };
}

async function run(id: number, files: File[]) {
  const modelPromise = loadFaceModel();
  let model: FaceModel | null = null;
  void modelPromise.then((m) => (model = m));
  const late: number[] = [];
  const load = (i: number) => Promise.all([readExif(files[i]), decodeBitmap(files[i], LIMITS.analysisSize).catch(() => null)]);

  // Decode the next photo while this one is measured.
  let next = files.length ? load(0) : null;
  for (let i = 0; i < files.length; i++) {
    const [exif, bmp] = await next!;
    next = i + 1 < files.length ? load(i + 1) : null;
    if (cancelled.has(id)) {
      bmp?.close();
      return;
    }
    if (!bmp) {
      post({ type: "photo", id, index: i, exif, data: null, card: null });
      continue;
    }
    const ready = model as FaceModel | null;
    const { data, card } = await measureOne(bmp, ready);
    if (!ready) late.push(i);
    post({ type: "photo", id, index: i, exif, data, card }, [card]);
  }

  const ready = late.length ? await modelPromise : null;
  if (ready) {
    post({ type: "faces-start", id, total: late.length });
    for (const i of late) {
      if (cancelled.has(id)) return;
      let faces = null;
      try {
        const bmp = await decodeBitmap(files[i], LIMITS.analysisSize);
        const c = drawFit(bmp, LIMITS.analysisSize, work!);
        bmp.close();
        faces = facesOf(ready, c);
      } catch {
        // keep going without faces for this one
      }
      post({ type: "faces", id, index: i, faces });
    }
  }
  post({ type: "done", id });
}

// One photo added later in the template studio.
async function one(id: number, file: File) {
  const [exif, bmp] = await Promise.all([readExif(file), decodeBitmap(file, LIMITS.analysisSize).catch(() => null)]);
  if (!bmp) return post({ type: "one", id, exif, data: null });
  const { data, card } = await measureOne(bmp, await loadFaceModel());
  card.close();
  post({ type: "one", id, exif, data });
}

scope.onmessage = (e) => {
  const m = e.data;
  if (m.type === "warm") {
    if (supported) void loadFaceModel();
  } else if (m.type === "cancel") {
    cancelled.add(m.id);
  } else if (!supported) {
    post({ type: "unsupported", id: m.id });
  } else if (m.type === "run") {
    run(m.id, m.files).catch((err) => {
      console.error("[analysis worker]", err);
      post({ type: "unsupported", id: m.id });
    });
  } else if (m.type === "one") {
    one(m.id, m.file).catch(() => post({ type: "one", id: m.id, exif: { takenAt: null, isFrontCamera: false, gps: null }, data: null }));
  }
};
