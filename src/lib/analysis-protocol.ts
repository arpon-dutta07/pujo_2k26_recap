// Messages between the page (analyze.ts) and the analysis worker.
import type { ExifInfo } from "./exif";
import type { FaceInfo } from "./types";

// What the worker measures for one photo. null when it could not be opened.
export type Measured = {
  width: number;
  height: number;
  hash: Uint8Array;
  sharpness: number;
  brightness: number;
  faces: FaceInfo | null; // null: the face model was not ready yet
  thumb: Blob; // JPEG thumbnail for the page
};

export type WorkerIn =
  | { type: "warm" }
  | { type: "run"; id: number; files: File[] }
  | { type: "cancel"; id: number }
  | { type: "one"; id: number; file: File };

export type WorkerOut =
  // The worker cannot do the job here (no OffscreenCanvas 2D): use the page.
  | { type: "unsupported"; id: number }
  // One photo measured, in file order. `card` is a small bitmap for the 3D cards.
  | { type: "photo"; id: number; index: number; exif: ExifInfo; data: Measured | null; card: ImageBitmap | null }
  // Photos measured before the face model was ready get faces in a second pass.
  | { type: "faces-start"; id: number; total: number }
  | { type: "faces"; id: number; index: number; faces: FaceInfo | null }
  | { type: "done"; id: number }
  | { type: "one"; id: number; exif: ExifInfo; data: Measured | null };
