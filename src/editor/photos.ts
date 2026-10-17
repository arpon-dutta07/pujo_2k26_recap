// Preview images for the studio. Thumbnails (360 px) are made during analysis;
// a sharper 1080 px copy is made on demand, one at a time, for big slots.
import { useEffect, useReducer } from "react";
import type { Photo } from "../lib/types";

const mid = new Map<string, string>();
const started = new Set<string>();
const listeners = new Set<() => void>();
let queue: Promise<void> = Promise.resolve();

async function makeMid(photo: Photo): Promise<string> {
  const landscape = photo.width >= photo.height;
  const bmp = await createImageBitmap(
    photo.file,
    landscape ? { resizeHeight: 1080, resizeQuality: "high" } : { resizeWidth: 1080, resizeQuality: "high" },
  );
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
  c.width = c.height = 1;
  if (!blob) throw new Error("encode failed");
  return URL.createObjectURL(blob);
}

function request(photo: Photo) {
  if (started.has(photo.id)) return;
  started.add(photo.id);
  queue = queue
    .then(() => makeMid(photo))
    .then((url) => {
      mid.set(photo.id, url);
      listeners.forEach((l) => l());
    })
    .catch(() => undefined);
}

export function usePhotoSrc(photo: Photo | undefined, sharp: boolean): string | undefined {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const id = photo?.id;
  useEffect(() => {
    if (!photo || !sharp || mid.has(photo.id)) return;
    listeners.add(bump);
    request(photo);
    return () => {
      listeners.delete(bump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sharp]);
  if (!photo) return undefined;
  return (sharp && mid.get(photo.id)) || photo.thumbUrl;
}

export function clearPhotoPreviews() {
  mid.forEach((u) => URL.revokeObjectURL(u));
  mid.clear();
  started.clear();
}
