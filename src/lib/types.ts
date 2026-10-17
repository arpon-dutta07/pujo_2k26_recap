import type { DayKey } from "../config";

export type PhotoStatus = "pending" | "ok" | "blurry" | "duplicate" | "unreadable";

export type FaceBox = { x: number; y: number; w: number; h: number };

export type FaceInfo = {
  count: number;
  eyesClosed: number;
  smile: number; // 0..1, mean over faces
  largestArea: number; // fraction of the frame
  boxes: FaceBox[]; // normalised 0..1
};

export type Photo = {
  id: string;
  file: File;
  index: number;
  takenAt: Date | null;
  fromExif: boolean;
  isFrontCamera: boolean;
  gps: { lat: number; lon: number } | null;
  width: number;
  height: number;
  thumbUrl: string;
  hash: Uint8Array | null; // 64-bit dHash, 8 bytes
  sharpness: number;
  brightness: number;
  faces: FaceInfo | null;
  day: DayKey | "before" | "after" | null;
  status: PhotoStatus;
  duplicateOf: string | null;
  burstSize: number;
  kind: "people" | "thakur";
  score: number;
};

export type AnalysisPhase = "reading" | "looking" | "faces" | "choosing" | "done";

export type Progress = {
  phase: AnalysisPhase;
  done: number;
  total: number;
  duplicates: number;
  blurry: number;
  faces: number;
  unreadable: number;
};
