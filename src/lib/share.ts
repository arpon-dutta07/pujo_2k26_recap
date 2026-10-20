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

// Every picture as its own JPG, one after another. Browsers drop downloads
// that come too close together, so there is a short gap between them.
export async function downloadAll(items: ExportFile[], onEach?: (done: number) => void, gapMs = 700) {
  for (let i = 0; i < items.length; i++) {
    downloadBlob(items[i].blob, items[i].name);
    onEach?.(i + 1);
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
}

// Instagram's, Facebook's and other apps' own browsers do not save downloads.
export const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|; wv\)/i.test(navigator.userAgent);
