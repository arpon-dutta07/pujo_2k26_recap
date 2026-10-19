// Renders every page at full size, then offers the phone's share sheet or a ZIP.
// Sharing happens on a second tap so the browser still counts it as a tap.
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CloseIcon, DownloadIcon, ShareIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import { canShareFiles, downloadBlob, downloadZip, shareFiles, type ExportFile } from "../lib/share";
import type { Photo } from "../lib/types";
import { exportProject } from "./render";
import type { Project } from "./types";

export function ExportSheet({
  project,
  photo,
  onClose,
  onToast,
}: {
  project: Project;
  photo: (id: string) => Photo | undefined;
  onClose: () => void;
  onToast: (t: string) => void;
}) {
  const [progress, setProgress] = useState({ done: 0, total: project.pages.length });
  const [files, setFiles] = useState<Array<ExportFile & { url: string }> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    let made: Array<ExportFile & { url: string }> = [];
    exportProject(project, photo, (done, total) => setProgress({ done, total }), ctrl.signal)
      .then((out) => {
        made = out.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) }));
        setFiles(made);
      })
      .catch((err) => {
        if ((err as DOMException)?.name !== "AbortError") {
          console.error(err);
          setFailed(true);
        }
      });
    return () => {
      ctrl.abort();
      made.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [project, photo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zipName = project.format === "story" ? "pujo-2026-story.zip" : "pujo-2026-carousel.zip";
  const shareable = files ? canShareFiles(files) : false;

  const share = async () => {
    if (!files) return;
    if (shareable) {
      const r = await shareFiles(files);
      if (r !== "failed") return;
    }
    await downloadZip(files, zipName);
    onToast(shareable ? "Share হল না, ZIP নামিয়ে দিলাম" : "ZIP download হয়ে গেছে");
  };

  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;

  return (
    <>
      <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="sheet export-sheet"
        role="dialog"
        aria-label="ছবি তৈরি"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300 }}
      >
        <div className="export-head">
          <h3>{files ? `${bnNum(files.length)}টা ছবি রেডি` : failed ? "উফ, আটকে গেল" : "ছবিগুলো রেডি করছি…"}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="বন্ধ করো">
            <CloseIcon />
          </button>
        </div>

        {!files && !failed && (
          <>
            <p>
              পাতা {bnNum(Math.min(progress.done + 1, progress.total))}/{bnNum(progress.total)}
            </p>
            <div className="export-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${pct}%` }} />
            </div>
          </>
        )}

        {failed && <p>কিছু একটা গোলমাল হল। আর একবার চেষ্টা করো, না হলে পেজটা রিফ্রেশ করো।</p>}

        {files && (
          <>
            <div className="export-strip">
              {files.map((f) => (
                <button type="button" key={f.name} className="export-shot" onClick={() => downloadBlob(f.blob, f.name)} title="Download">
                  <img src={f.url} alt={f.name} />
                </button>
              ))}
            </div>
            {files.length > 20 && <p className="note">Instagram একটা পোস্টে ২০টা পর্যন্ত ছবি নেয়। দুটো পোস্টে ভাগ করে দাও।</p>}
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={share}>
                <ShareIcon /> {shareable ? "Share" : "Download (ZIP)"}
              </button>
              {shareable && (
                <button type="button" className="btn btn-ghost" onClick={() => downloadZip(files, zipName)}>
                  <DownloadIcon /> ZIP
                </button>
              )}
            </div>
            <p className="note">
              প্রথম ছবিটাই cover হবে। একটা ছবি আলাদা করে নামাতে চাইলে সেটায় ট্যাপ করো।
            </p>
          </>
        )}
      </motion.div>
    </>
  );
}
