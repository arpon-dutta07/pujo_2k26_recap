import { zipSync } from "fflate";

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
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadZip(items: ExportFile[], zipName: string) {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const f of items) entries[f.name] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
  const zipped = zipSync(entries);
  downloadBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), zipName);
}
