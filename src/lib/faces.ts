// The only real AI model on the site: Google's MediaPipe Face Landmarker,
// served from our own /public folder and run on the visitor's GPU (or CPU).
// Normally it lives in the analysis worker (analysis.worker.ts), so the page
// never waits on it.
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FaceInfo } from "./types";

const BASE = import.meta.env.BASE_URL;

let loading: Promise<FaceLandmarker | null> | null = null;

export function loadFaceModel(): Promise<FaceLandmarker | null> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(`${BASE}mediapipe/wasm`);
      const make = (delegate: "GPU" | "CPU") =>
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `${BASE}mediapipe/face_landmarker.task`, delegate },
          runningMode: "IMAGE",
          numFaces: 12,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          outputFaceBlendshapes: true,
        });
      // In the analysis worker the CPU is the better choice: measured on 50
      // photos it was twice as fast as the GPU and never fought the 3D scene
      // for the graphics card. On the page (old browsers) try the GPU first.
      const order: Array<"GPU" | "CPU"> = typeof document === "undefined" ? ["CPU", "GPU"] : ["GPU", "CPU"];
      try {
        return await make(order[0]);
      } catch {
        return await make(order[1]);
      }
    } catch (err) {
      console.warn("[faces] model unavailable, continuing without it", err);
      return null;
    }
  })();
  return loading;
}

const EYES_CLOSED = 0.5;
const MIN_FACE_AREA = 0.0015;

export function detectFaces(model: FaceLandmarker, image: TexImageSource): FaceInfo {
  const result = model.detect(image);
  const boxes: FaceInfo["boxes"] = [];
  let eyesClosed = 0;
  let smileSum = 0;
  let largestArea = 0;

  result.faceLandmarks.forEach((points, i) => {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    const area = box.w * box.h;
    if (area < MIN_FACE_AREA) return;
    boxes.push(box);
    largestArea = Math.max(largestArea, area);

    const scores: Record<string, number> = {};
    for (const c of result.faceBlendshapes[i]?.categories ?? []) scores[c.categoryName] = c.score;
    if ((scores.eyeBlinkLeft ?? 0) > EYES_CLOSED && (scores.eyeBlinkRight ?? 0) > EYES_CLOSED) eyesClosed++;
    smileSum += ((scores.mouthSmileLeft ?? 0) + (scores.mouthSmileRight ?? 0)) / 2;
  });

  return {
    count: boxes.length,
    eyesClosed,
    smile: boxes.length ? smileSum / boxes.length : 0,
    largestArea,
    boxes,
  };
}
