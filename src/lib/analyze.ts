import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { LIMITS } from "../config";
import type { Measured, WorkerIn, WorkerOut } from "./analysis-protocol";
import { pujoDayOf } from "./days";
import { readExif, type ExifInfo } from "./exif";
import { detectFaces, loadFaceModel } from "./faces";
import { canvasToJpeg, decodeBitmap, drawFit, hamming, measure } from "./image";
import type { Photo, Progress } from "./types";

export type AnalyzeCallbacks = {
  onProgress: (p: Progress) => void;
  // Fired as soon as one photo is measured, so the 3D funnel and the live
  // wall can show it. `card` is a small picture of it for the 3D cards.
  onPhoto: (photo: Photo, card: ImageBitmap | HTMLCanvasElement) => void;
};

// ---------- the analysis worker ----------
// Decoding, measuring and the face model run in analysis.worker.ts, so the
// page never freezes (the face model alone used to block it for seconds).
// Browsers without OffscreenCanvas in workers get the same work done here.

let worker: Worker | null | undefined;
let nextId = 1;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return null;
  try {
    worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
  } catch {
    worker = null;
  }
  return worker;
}

const send = (w: Worker, m: WorkerIn) => w.postMessage(m);

// Start the face model download while people read the landing page.
export function warmAnalyzer() {
  const w = getWorker();
  if (w) send(w, { type: "warm" });
  else void loadFaceModel();
}

// A macrotask break so the 3D scene can draw a frame. MessageChannel instead of
// setTimeout: background tabs clamp timers to 1 s, which made a 25-photo run take 27 s.
const channel = new MessageChannel();
const waiting: Array<() => void> = [];
channel.port1.onmessage = () => waiting.shift()?.();
const yieldToUI = () =>
  new Promise<void>((r) => {
    waiting.push(r);
    channel.port2.postMessage(0);
  });

// Same pose: hashes within a few bits AND taken close together.
const BURST_SECONDS = 90;
const BURST_MINUTES = 5;
const DUP_BITS_BURST = 12;
const DUP_BITS_TIMED = 10;
const DUP_BITS_UNTIMED = 6;

function emptyPhoto(file: File, index: number, exif: ExifInfo): Photo {
  const takenAt = exif.takenAt ?? (file.lastModified ? new Date(file.lastModified) : null);
  return {
    id: `p${index}`,
    file,
    index,
    takenAt,
    fromExif: Boolean(exif.takenAt),
    isFrontCamera: exif.isFrontCamera,
    gps: exif.gps,
    width: 0,
    height: 0,
    thumbUrl: "",
    hash: null,
    sharpness: 0,
    brightness: 0.5,
    faces: null,
    day: exif.takenAt ? pujoDayOf(exif.takenAt) : null,
    status: "pending",
    duplicateOf: null,
    burstSize: 1,
    kind: exif.isFrontCamera ? "people" : "thakur",
    score: 0,
  };
}

const kindOf = (p: Photo): Photo["kind"] => (p.isFrontCamera || (p.faces?.count ?? 0) > 0 ? "people" : "thakur");

const secondsApart = (a: Photo, b: Photo) =>
  a.fromExif && b.fromExif && a.takenAt && b.takenAt ? Math.abs(a.takenAt.getTime() - b.takenAt.getTime()) / 1000 : null;

function isNearDuplicate(a: Photo, b: Photo): boolean {
  if (!a.hash || !b.hash) return false;
  const d = hamming(a.hash, b.hash);
  const gap = secondsApart(a, b);
  if (gap === null) return d <= DUP_BITS_UNTIMED;
  if (gap <= BURST_SECONDS) return d <= DUP_BITS_BURST;
  return gap <= BURST_MINUTES * 60 && d <= DUP_BITS_TIMED;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function applyMeasured(photo: Photo, m: Measured) {
  photo.width = m.width;
  photo.height = m.height;
  photo.hash = m.hash;
  photo.sharpness = m.sharpness;
  photo.brightness = m.brightness;
  photo.faces = m.faces;
  photo.kind = kindOf(photo);
  photo.thumbUrl = URL.createObjectURL(m.thumb);
}

// Live, provisional verdict for the animation. finalize() decides for real.
function liveVerdict(photo: Photo, photos: Photo[], sharpSeen: number[], progress: Progress) {
  const recent = photos.slice(Math.max(0, photos.length - 26), photos.length - 1);
  const dupe = recent.find((q) => q.status !== "unreadable" && isNearDuplicate(photo, q));
  const med = median(sharpSeen);
  if (dupe) {
    photo.status = "duplicate";
    progress.duplicates++;
  } else if (sharpSeen.length >= 5 && photo.sharpness < Math.max(18, 0.32 * med)) {
    photo.status = "blurry";
    progress.blurry++;
  } else {
    photo.status = "ok";
  }
}

function wrapUp(photos: Photo[], progress: Progress, cb: AnalyzeCallbacks, total: number) {
  progress.phase = "choosing";
  progress.done = total;
  progress.total = total;
  cb.onProgress({ ...progress });
  finalize(photos);
  progress.duplicates = photos.filter((p) => p.status === "duplicate").length;
  progress.blurry = photos.filter((p) => p.status === "blurry").length;
  progress.phase = "done";
  cb.onProgress({ ...progress });
}

const freshProgress = (total: number): Progress => ({
  phase: "reading",
  done: 0,
  total,
  duplicates: 0,
  blurry: 0,
  faces: 0,
  unreadable: 0,
});

export async function analyzePhotos(files: File[], cb: AnalyzeCallbacks, signal?: AbortSignal): Promise<Photo[]> {
  const w = getWorker();
  if (w) {
    const out = await analyzeInWorker(w, files, cb, signal);
    if (out) return out;
  }
  return analyzeHere(files, cb, signal);
}

// Resolves null when the worker cannot do it before any photo came back,
// so the caller can fall back to the page.
function analyzeInWorker(w: Worker, files: File[], cb: AnalyzeCallbacks, signal?: AbortSignal): Promise<Photo[] | null> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const progress = freshProgress(files.length);
    const photos: Photo[] = [];
    const sharpSeen: number[] = [];
    cb.onProgress({ ...progress });

    const stop = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      send(w, { type: "cancel", id });
      stop();
      reject(new DOMException("aborted", "AbortError"));
    };
    const onError = (e: ErrorEvent) => {
      stop();
      if (!photos.length) resolve(null);
      else reject(e.error ?? new Error(e.message));
    };
    const onMessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.type === "unsupported") {
        stop();
        if (!photos.length) resolve(null);
        else reject(new Error("analysis worker stopped"));
      } else if (m.type === "photo") {
        const photo = emptyPhoto(files[m.index], m.index, m.exif);
        photos.push(photo);
        if (!m.data) {
          photo.status = "unreadable";
          progress.unreadable++;
        } else {
          applyMeasured(photo, m.data);
          if (photo.faces?.count) progress.faces++;
          sharpSeen.push(photo.sharpness);
          liveVerdict(photo, photos, sharpSeen, progress);
          cb.onPhoto(photo, m.card!);
        }
        progress.phase = "looking";
        progress.done = photos.length;
        cb.onProgress({ ...progress });
      } else if (m.type === "faces-start") {
        progress.phase = "faces";
        progress.done = 0;
        progress.total = m.total;
        cb.onProgress({ ...progress });
      } else if (m.type === "faces") {
        const p = photos[m.index];
        if (p && m.faces) {
          p.faces = m.faces;
          if (m.faces.count) progress.faces++;
          p.kind = kindOf(p);
        }
        progress.done++;
        cb.onProgress({ ...progress });
      } else if (m.type === "done") {
        stop();
        wrapUp(photos, progress, cb, files.length);
        resolve(photos);
      }
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
    send(w, { type: "run", id, files });
  });
}

// The same work on the page itself, for browsers without the worker.
async function analyzeHere(files: File[], cb: AnalyzeCallbacks, signal?: AbortSignal): Promise<Photo[]> {
  const modelPromise = loadFaceModel();
  let model: FaceLandmarker | null = null;
  void modelPromise.then((m) => (model = m));

  const progress = freshProgress(files.length);
  cb.onProgress({ ...progress });

  const photos: Photo[] = [];
  const work = document.createElement("canvas");
  const needFaces: Photo[] = [];
  const sharpSeen: number[] = [];

  const load = (i: number) =>
    Promise.all([readExif(files[i]), decodeBitmap(files[i], LIMITS.analysisSize).catch(() => null)]);

  let next = files.length ? load(0) : null;
  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const [exif, bmp] = await next!;
    next = i + 1 < files.length ? load(i + 1) : null;

    const photo = emptyPhoto(files[i], i, exif);
    photos.push(photo);

    if (!bmp) {
      photo.status = "unreadable";
      progress.unreadable++;
    } else {
      photo.width = bmp.width;
      photo.height = bmp.height;
      const analysis = drawFit(bmp, LIMITS.analysisSize, work);
      const thumb = drawFit(bmp, LIMITS.thumbSize);
      bmp.close();

      const m = measure(analysis);
      photo.hash = m.hash;
      photo.sharpness = m.sharpness;
      photo.brightness = m.brightness;
      sharpSeen.push(m.sharpness);

      const ready = model as FaceLandmarker | null;
      if (ready) photo.faces = detectFaces(ready, analysis);
      else needFaces.push(photo);
      if (photo.faces?.count) progress.faces++;
      photo.kind = kindOf(photo);

      photo.thumbUrl = URL.createObjectURL(canvasToJpeg(thumb, 0.8));
      liveVerdict(photo, photos, sharpSeen, progress);
      cb.onPhoto(photo, thumb);
    }

    progress.phase = "looking";
    progress.done = i + 1;
    cb.onProgress({ ...progress });
    await yieldToUI();
  }

  // Photos measured before the model finished downloading get their face pass now.
  const pending = needFaces.filter((p) => p.status !== "unreadable");
  if (pending.length) {
    const ready = await modelPromise;
    if (ready) {
      progress.phase = "faces";
      progress.done = 0;
      progress.total = pending.length;
      cb.onProgress({ ...progress });
      for (const p of pending) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        try {
          const bmp = await decodeBitmap(p.file, LIMITS.analysisSize);
          const c = drawFit(bmp, LIMITS.analysisSize, work);
          bmp.close();
          p.faces = detectFaces(ready, c);
          if (p.faces.count) progress.faces++;
          p.kind = kindOf(p);
        } catch {
          // keep going without faces for this one
        }
        progress.done++;
        cb.onProgress({ ...progress });
        await yieldToUI();
      }
    }
  }

  wrapUp(photos, progress, cb, files.length);
  return photos;
}

function scorePhoto(p: Photo, p75: number): number {
  const sharp = Math.min(1.2, p.sharpness / Math.max(1, p75));
  const exposure = p.brightness < 0.06 ? 0.3 : p.brightness > 0.92 ? 0.5 : 1;
  let s = 0.5 * sharp + 0.15 * exposure;
  const f = p.faces;
  if (f && f.count) {
    s += 0.12 + 0.25 * f.smile;
    s -= 0.45 * (f.eyesClosed / f.count);
    s += Math.min(0.08, f.largestArea * 0.5);
  }
  return s;
}

// Whole-set decisions: blur relative to this person's own photos, bursts by hash + time.
export function finalize(photos: Photo[]) {
  const decoded = photos.filter((p) => p.status !== "unreadable");
  if (!decoded.length) return;

  const sharp = decoded.map((p) => p.sharpness).sort((a, b) => a - b);
  const med = sharp[Math.floor(sharp.length / 2)];
  const p75 = sharp[Math.floor(sharp.length * 0.75)];
  for (const p of decoded) p.score = scorePhoto(p, p75);

  // Blur: below a third of the median, never more than 40% of the set.
  const threshold = Math.max(18, 0.32 * med);
  const blurry = decoded
    .filter((p) => p.sharpness < threshold)
    .sort((a, b) => a.sharpness - b.sharpness)
    .slice(0, Math.floor(decoded.length * 0.4));
  const blurrySet = new Set(blurry.map((p) => p.id));
  for (const p of decoded) {
    p.status = blurrySet.has(p.id) ? "blurry" : "ok";
    p.duplicateOf = null;
    p.burstSize = 1;
  }

  // Union-find over a sliding window in time order.
  const ordered = [...decoded].sort(
    (a, b) => (a.takenAt?.getTime() ?? Infinity) - (b.takenAt?.getTime() ?? Infinity) || a.index - b.index,
  );
  const parent = ordered.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < Math.min(ordered.length, i + 40); j++) {
      if (isNearDuplicate(ordered[i], ordered[j])) parent[find(j)] = find(i);
    }
  }
  const clusters = new Map<number, Photo[]>();
  ordered.forEach((p, i) => {
    const root = find(i);
    clusters.set(root, [...(clusters.get(root) ?? []), p]);
  });
  for (const group of clusters.values()) {
    if (group.length < 2) continue;
    const best = [...group].sort(
      (a, b) => Number(a.status === "blurry") - Number(b.status === "blurry") || b.score - a.score,
    )[0];
    best.burstSize = group.length;
    for (const p of group) {
      if (p === best) continue;
      p.status = "duplicate";
      p.duplicateOf = best.id;
    }
  }
}

// One photo the visitor adds later, in the template studio. Same measurements
// as the main run, without the duplicate check; it always counts as usable.
export async function analyzeExtra(file: File, id: string, index: number): Promise<Photo | null> {
  const w = getWorker();
  if (w) {
    const reply = await new Promise<Extract<WorkerOut, { type: "one" | "unsupported" }>>((resolve) => {
      const req = nextId++;
      const onMessage = (e: MessageEvent<WorkerOut>) => {
        if (e.data.id !== req || (e.data.type !== "one" && e.data.type !== "unsupported")) return;
        w.removeEventListener("message", onMessage);
        resolve(e.data);
      };
      w.addEventListener("message", onMessage);
      send(w, { type: "one", id: req, file });
    });
    if (reply.type === "one") {
      if (!reply.data) return null;
      const photo = emptyPhoto(file, index, reply.exif);
      photo.id = id;
      applyMeasured(photo, reply.data);
      photo.status = "ok";
      photo.score = 1;
      return photo;
    }
  }
  const [exif, bmp] = await Promise.all([readExif(file), decodeBitmap(file, LIMITS.analysisSize).catch(() => null)]);
  if (!bmp) return null;
  const photo = emptyPhoto(file, index, exif);
  photo.id = id;
  photo.width = bmp.width;
  photo.height = bmp.height;
  const analysis = drawFit(bmp, LIMITS.analysisSize);
  const thumb = drawFit(bmp, LIMITS.thumbSize);
  bmp.close();
  const m = measure(analysis);
  photo.hash = m.hash;
  photo.sharpness = m.sharpness;
  photo.brightness = m.brightness;
  const model = await loadFaceModel();
  if (model) {
    try {
      photo.faces = detectFaces(model, analysis);
    } catch {
      // keep going without faces
    }
  }
  photo.kind = kindOf(photo);
  photo.status = "ok";
  photo.score = 1;
  photo.thumbUrl = URL.createObjectURL(canvasToJpeg(thumb, 0.8));
  return photo;
}
