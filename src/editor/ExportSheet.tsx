// Renders every page at full size, then saves each one as its own JPG, one
// after another, on any device: no ZIP. The phone's share sheet stays as an
// extra for posting straight to Instagram (it needs its own tap).
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CloseIcon, DownloadIcon, RestartIcon, ShareIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import { canShareFiles, downloadAll, downloadBlob, inAppBrowser, shareFiles, type ExportFile } from "../lib/share";
import type { Photo } from "../lib/types";
import { exportProject, type ExportResult } from "./render";
import type { Project } from "./types";

type Phase = "making" | "saving" | "done" | "failed";

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
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("making");
  const [progress, setProgress] = useState({ done: 0, total: project.pages.length });
  const [files, setFiles] = useState<Array<ExportFile & { url: string }>>([]);
  const [skipped, setSkipped] = useState<ExportResult["failed"]>([]);
  const [saved, setSaved] = useState(0);
  const [reason, setReason] = useState("");
  const inApp = inAppBrowser();

  useEffect(() => {
    const ctrl = new AbortController();
    let made: Array<ExportFile & { url: string }> = [];
    setPhase("making");
    setFiles([]);
    setSkipped([]);
    setSaved(0);
    exportProject(project, photo, (done, total) => setProgress({ done, total }), ctrl.signal)
      .then(async ({ files: out, failed }) => {
        if (ctrl.signal.aborted) return;
        made = out.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) }));
        setFiles(made);
        setSkipped(failed);
        if (!out.length) {
          setReason(failed[0]?.reason ?? "");
          setPhase("failed");
          return;
        }
        setPhase("saving");
        await downloadAll(out, setSaved);
        if (!ctrl.signal.aborted) setPhase("done");
      })
      .catch((err) => {
        if ((err as DOMException)?.name === "AbortError") return;
        console.error(err);
        setReason((err as Error)?.message || String(err));
        setPhase("failed");
      });
    return () => {
      ctrl.abort();
      made.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [project, photo, run]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shareable = files.length > 0 && canShareFiles(files);
  const n = files.length;

  const saveAgain = async () => {
    setPhase("saving");
    setSaved(0);
    await downloadAll(files, setSaved);
    setPhase("done");
  };

  const share = async () => {
    const r = await shareFiles(files);
    if (r === "failed") onToast("Share হল না। ছবিগুলো তো নেমেই গেছে, Gallery থেকে দাও।");
  };

  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  const title =
    phase === "making"
      ? "ছবিগুলো বানাচ্ছি…"
      : phase === "saving"
        ? `নামছে… ${bnNum(saved)}/${bnNum(n)}`
        : phase === "done"
          ? `${bnNum(n)}টা ছবি নেমে গেছে`
          : "উফ, আটকে গেল";

  return (
    <>
      <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="sheet export-sheet"
        role="dialog"
        aria-label="ছবি নামানো"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300 }}
      >
        <div className="export-head">
          <h3 aria-live="polite">{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="বন্ধ করো">
            <CloseIcon />
          </button>
        </div>

        {inApp && (
          <p className="export-warn">
            Instagram বা Facebook-এর ভেতরের browser ছবি নামাতে দেয় না। উপরের মেনু থেকে Chrome বা Safari-তে খুলে নাও।
          </p>
        )}

        {phase === "making" && (
          <>
            <p>
              পাতা {bnNum(Math.min(progress.done + 1, progress.total))}/{bnNum(progress.total)}
            </p>
            <div className="export-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${pct}%` }} />
            </div>
          </>
        )}

        {phase === "failed" && (
          <>
            <p>কিছু একটা গোলমাল হল। আর একবার চেষ্টা করো, তাতেও না হলে অন্য কয়েকটা app বন্ধ করে দেখো।</p>
            {reason && <p className="export-reason">কারণ: {reason}</p>}
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={() => setRun((r) => r + 1)}>
                <RestartIcon /> আবার চেষ্টা করো
              </button>
            </div>
          </>
        )}

        {n > 0 && (
          <>
            <div className="export-strip">
              {files.map((f, i) => (
                <button
                  type="button"
                  key={f.name}
                  className="export-shot"
                  data-saved={i < saved || undefined}
                  onClick={() => downloadBlob(f.blob, f.name)}
                  title="এটা আলাদা করে নামাও"
                >
                  <img src={f.url} alt={f.name} />
                </button>
              ))}
            </div>
            {skipped.length > 0 && (
              <p className="export-reason">
                পাতা {skipped.map((s) => bnNum(s.page)).join(", ")} বানানো গেল না ({skipped[0].reason})। বাকিগুলো নেমেছে।
              </p>
            )}
            {n > 20 && <p className="note">Instagram একটা পোস্টে ২০টা পর্যন্ত ছবি নেয়। দুটো পোস্টে ভাগ করে দাও।</p>}
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={saveAgain} disabled={phase === "saving"}>
                <DownloadIcon /> আবার নামাও
              </button>
              {shareable && (
                <button type="button" className="btn btn-ghost" onClick={share} disabled={phase === "saving"}>
                  <ShareIcon /> Share
                </button>
              )}
            </div>
            <p className="note">ফোনের Gallery বা Downloads-এ পাবে, প্রথমটাই cover। কোনো একটা আলাদা করে চাইলে সেটায় ট্যাপ করো।</p>
          </>
        )}
      </motion.div>
    </>
  );
}
