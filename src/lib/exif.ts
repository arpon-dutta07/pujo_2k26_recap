import exifr from "exifr";

export type ExifInfo = {
  takenAt: Date | null;
  isFrontCamera: boolean;
  gps: { lat: number; lon: number } | null;
};

type RawExif = {
  DateTimeOriginal?: Date | string;
  CreateDate?: Date | string;
  LensModel?: string;
  Model?: string;
  latitude?: number;
  longitude?: number;
};

const toDate = (v: Date | string | undefined): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// iPhone and Pixel write "front camera" in LensModel. Other phones often say nothing,
// so this is a hint, never the only signal.
const FRONT_RE = /front|selfie/i;

export async function readExif(file: File): Promise<ExifInfo> {
  try {
    const raw = (await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
      interop: false,
      ifd1: false,
      mergeOutput: true,
    })) as RawExif | undefined;
    if (!raw) return { takenAt: null, isFrontCamera: false, gps: null };
    const takenAt = toDate(raw.DateTimeOriginal) ?? toDate(raw.CreateDate);
    const gps =
      typeof raw.latitude === "number" && typeof raw.longitude === "number" && (raw.latitude !== 0 || raw.longitude !== 0)
        ? { lat: raw.latitude, lon: raw.longitude }
        : null;
    return { takenAt, isFrontCamera: FRONT_RE.test(raw.LensModel ?? ""), gps };
  } catch {
    return { takenAt: null, isFrontCamera: false, gps: null };
  }
}
