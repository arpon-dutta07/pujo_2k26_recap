export type ExportFile = { name: string; blob: Blob };

const toFiles = (items: ExportFile[]) => items.map((f) => new File([f.blob], f.name, { type: f.blob.type }));

export function canShareFiles(items: ExportFile[]): boolean {
  if (!items.length || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: toFiles(items) });
  } catch {
    return false;
  }
}

// Opens the phone's share sheet (Instagram, WhatsApp, "Save images" on iPhone).
// Must be called straight from a tap, so blobs are rendered beforehand.
export async function shareFiles(items: ExportFile[], text?: string): Promise<"shared" | "cancelled" | "failed"> {
  try {
    await navigator.share({ files: toFiles(items), text });
    return "shared";
  } catch (err) {
    return (err as DOMException)?.name === "AbortError" ? "cancelled" : "failed";
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // A phone's download manager can read the file a while after the tap.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Every picture as its own JPG, one after another. Must start straight from a
// tap: after the first file, Chrome only lets a page download more while the
// user's tap is fresh (or after its one-time "Allow" prompt), and silently drops
// the rest otherwise. The first file goes out before anything is awaited, the
// others follow close behind (20 pictures take about 2 s), well inside the
// tap's few seconds.
export const DOWNLOAD_GAP_MS = 120;

export async function downloadAll(items: ExportFile[], onEach?: (done: number) => void, gapMs = DOWNLOAD_GAP_MS) {
  for (let i = 0; i < items.length; i++) {
    downloadBlob(items[i].blob, items[i].name);
    onEach?.(i + 1);
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
}

// True right after a real tap or click (Chrome counts about 5 seconds).
export const tapIsFresh = () => (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;

// iPhone and iPad (iPadOS says it is a Mac, but has a touch screen). Safari there
// saves one download per tap, so many pictures go through the share sheet's
// "Save Images" instead, straight into Photos.
export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Instagram's, Facebook's and other apps' own browsers do not save downloads.
export const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|; wv\)/i.test(navigator.userAgent);
