import type { DayKey } from "../config";

// A photo the visitor added: its shape, a small thumbnail and, from EXIF,
// when it was taken (moodboard text can show the Pujo day).
export type Photo = {
  id: string;
  file: File;
  index: number;
  takenAt: Date | null;
  fromExif: boolean;
  width: number;
  height: number;
  thumbUrl: string;
  day: DayKey | "before" | "after" | null;
};
