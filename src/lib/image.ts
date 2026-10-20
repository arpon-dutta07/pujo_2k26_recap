// Decoding photos and making thumbnails.

export async function decodeBitmap(file: Blob, targetWidth?: number): Promise<ImageBitmap> {
  if (targetWidth) {
    try {
      return await createImageBitmap(file, { resizeWidth: targetWidth, resizeQuality: "medium" });
    } catch {
      // Older Safari ignores or rejects resize options: fall back to a full decode.
    }
  }
  return createImageBitmap(file);
}

// Works with a page canvas or an OffscreenCanvas.
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

const ctx2d = (c: AnyCanvas) => (c as HTMLCanvasElement).getContext("2d", { willReadFrequently: true })!;

export function drawFit<C extends AnyCanvas = HTMLCanvasElement>(
  src: CanvasImageSource & { width: number; height: number },
  maxSide: number,
  canvas?: C,
): C {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = canvas ?? ((typeof document === "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas")) as C);
  c.width = w;
  c.height = h;
  ctx2d(c).drawImage(src, 0, 0, w, h);
  return c;
}

// For the full-size export. The quick string route first (a 1080 px page is
// only a few MB that way); toBlob() can wait a second or more for the browser
// to be idle, so it is only the fallback.
export async function canvasToJpegAsync(c: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  try {
    return canvasToJpeg(c, quality);
  } catch {
    const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("could not make the JPG");
    return blob;
  }
}

// Synchronous on purpose: toBlob() is deferred to idle time in background tabs
// (measured 1 s per thumbnail), which stalled the whole analysis.
export function canvasToJpeg(c: HTMLCanvasElement, quality = 0.82): Blob {
  const url = c.toDataURL("image/jpeg", quality);
  const bin = atob(url.slice(url.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}
