// Decoding, thumbnails and the two "not really AI" measurements:
// a perceptual hash for near-duplicates and a Laplacian focus score for blur.

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

export function drawFit(src: CanvasImageSource & { width: number; height: number }, maxSide: number, canvas?: HTMLCanvasElement) {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = canvas ?? document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  return c;
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

export type PixelStats = { hash: Uint8Array; sharpness: number; brightness: number };

export function measure(canvas: HTMLCanvasElement): PixelStats {
  const { width: w, height: h } = canvas;
  const data = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const g = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    gray[i] = g;
    sum += g;
  }
  return { hash: dHash(gray, w, h), sharpness: focusScore(gray, w, h), brightness: sum / gray.length / 255 };
}

// Laplacian variance per tile; the photo is as sharp as its sharpest regions,
// so a crisp face against a dark, empty night sky still scores high.
function focusScore(gray: Float32Array, w: number, h: number): number {
  const TILES = 4;
  const tw = Math.floor(w / TILES);
  const th = Math.floor(h / TILES);
  const variances: number[] = [];
  for (let ty = 0; ty < TILES; ty++) {
    for (let tx = 0; tx < TILES; tx++) {
      let s = 0;
      let s2 = 0;
      let n = 0;
      const y0 = Math.max(1, ty * th);
      const y1 = Math.min(h - 1, (ty + 1) * th);
      const x0 = Math.max(1, tx * tw);
      const x1 = Math.min(w - 1, (tx + 1) * tw);
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) {
          const i = row + x;
          const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
          s += lap;
          s2 += lap * lap;
          n++;
        }
      }
      if (n > 0) {
        const mean = s / n;
        variances.push(s2 / n - mean * mean);
      }
    }
  }
  variances.sort((a, b) => b - a);
  const top = variances.slice(0, 3);
  return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
}

// 9x8 difference hash: 64 bits that barely change between two shots of the same pose.
function dHash(gray: Float32Array, w: number, h: number): Uint8Array {
  const cols = 9;
  const rows = 8;
  const cells = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor((r * h) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / rows));
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * w) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / cols));
      let s = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          s += gray[y * w + x];
          n++;
        }
      }
      cells[r * cols + c] = s / Math.max(1, n);
    }
  }
  const out = new Uint8Array(8);
  for (let r = 0; r < rows; r++) {
    let byte = 0;
    for (let c = 0; c < 8; c++) {
      if (cells[r * cols + c] < cells[r * cols + c + 1]) byte |= 1 << c;
    }
    out[r] = byte;
  }
  return out;
}

const POP = new Uint8Array(256).map((_, i) => {
  let n = 0;
  for (let v = i; v; v >>= 1) n += v & 1;
  return n;
});

export function hamming(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += POP[a[i] ^ b[i]];
  return d;
}
