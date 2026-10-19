// Turns a picked file into a Photo for the moodboards: its size, a small
// thumbnail and, from EXIF, when it was taken. Nothing else is looked at.
import { LIMITS } from "../config";
import { pujoDayOf } from "./days";
import { readExif } from "./exif";
import { canvasToJpeg, decodeBitmap, drawFit } from "./image";
import type { Photo } from "./types";

export const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name);

export async function importPhoto(file: File, id: string, index: number): Promise<Photo | null> {
  const [exif, bmp] = await Promise.all([readExif(file), decodeBitmap(file, LIMITS.decodeSize).catch(() => null)]);
  if (!bmp) return null;
  const thumb = drawFit(bmp, LIMITS.thumbSize);
  const photo: Photo = {
    id,
    file,
    index,
    takenAt: exif.takenAt ?? (file.lastModified ? new Date(file.lastModified) : null),
    fromExif: Boolean(exif.takenAt),
    width: bmp.width,
    height: bmp.height,
    thumbUrl: URL.createObjectURL(canvasToJpeg(thumb, 0.82)),
    day: exif.takenAt ? pujoDayOf(exif.takenAt) : null,
  };
  bmp.close();
  thumb.width = thumb.height = 1;
  return photo;
}
