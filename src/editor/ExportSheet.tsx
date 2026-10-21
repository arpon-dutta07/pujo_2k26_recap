// Renders every page at full size, then saves each one as its own JPG: no ZIP.
// Browsers only allow several downloads straight after a tap, so the saving
// starts from a tap: the one that opened this sheet if it is still fresh,
// otherwise the big button. On iPhone/iPad the button opens the share sheet,
// whose "Save Images" puts every page into Photos at once.
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, DownloadIcon, PhotosIcon, RestartIcon, ShareIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import {
  canShareFiles,
  DOWNLOAD_GAP_MS,
  downloadAll,
  downloadBlob,
  inAppBrowser,
  isIOS,
  shareFiles,
  tapIsFresh,
  type ExportFile,
} from "../lib/share";
import type { Photo } from "../lib/types";
import { CaptionPick } from "./CaptionPick";
import { exportProject, type ExportResult } from "./render";
import type { Project } from "./types";

type Phase = "making" | "ready" | "saving" | "done" | "failed";

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
  const alive = useRef(true);
  // About when the Download tap that opened this sheet happened.
  const openedAt = useRef(performance.now());
  const inApp = inAppBrowser();
  const ios = isIOS();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const saveAll = async (list: ExportFile[]) => {
    setPhase("saving");
    setSaved(0);
    await downloadAll(list, (k) => alive.current && setSaved(k));
    if (alive.current) setPhase("done");
  };

  useEffect(() => {
    const ctrl = new AbortController();
    let made: Array<ExportFile & { url: string }> = [];
    setPhase("making");
    setFiles([]);
    setSkipped([]);
    setSaved(0);
    exportProject(project, photo, (done, total) => setProgress({ done, total }), ctrl.signal)
      .then(({ files: out, failed }) => {
        if (ctrl.signal.aborted) return;
        made = out.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) }));
        setFiles(made);
        setSkipped(failed);
        if (!out.length) {
          setReason(failed[0]?.reason ?? "");
          setPhase("failed");
          return;
        }
        // Save at once only if every file can still go out inside the tap that
        // opened the sheet (Chrome counts about 5 s). Otherwise wait for the
        // button, or the browser keeps the first file and drops the rest.
        const lastAt = performance.now() - openedAt.current + out.length * DOWNLOAD_GAP_MS;
        if (!ios && tapIsFresh() && lastAt < 4000) void saveAll(out);
        else setPhase("ready");
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
    // saveAll only sets state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, photo, run]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shareable = files.length > 0 && canShareFiles(files);
  const n = files.length;
  // iPhone/iPad: the share sheet's "Save Images" is the way to keep them all.
  const viaShare = ios && shareable;

  const shareAll = async () => {
    const r = await shareFiles(files);
    if (r === "shared" && viaShare) setPhase("done");
    if (r === "failed") {
      if (viaShare) void saveAll(files);
      else onToast("Share হল না। ছবিগুলো Gallery বা Downloads থেকে দাও।");
    }
  };

  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  const title =
    phase === "making"
      ? "ছবিগুলো বানাচ্ছি…"
      : phase === "ready"
        ? `${bnNum(n)}টা ছবি রেডি`
        : phase === "saving"
          ? `নামছে… ${bnNum(saved)}/${bnNum(n)}`
          : phase === "done"
            ? viaShare
              ? `${bnNum(n)}টা ছবি রেডি`
              : `${bnNum(n)}টা ছবি নামানো হল`
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
              <button type="button" className="btn btn-primary" onClick={() => {
                  openedAt.current = performance.now();
                  setRun((r) => r + 1);
                }}
              >
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
                  data-saved={(!viaShare && i < saved) || undefined}
                  onClick={() => downloadBlob(f.blob, f.name)}
                  title="এটা আলাদা করে নামাও"
                >
                  <img src={f.url} alt={f.name} />
                </button>
              ))}
            </div>
            {skipped.length > 0 && (
              <p className="export-reason">
                পাতা {skipped.map((s) => bnNum(s.page)).join(", ")} বানানো গেল না ({skipped[0].reason})। বাকিগুলো রেডি।
              </p>
            )}
            {n > 20 && <p className="note">Instagram একটা পোস্টে ২০টা পর্যন্ত ছবি নেয়। দুটো পোস্টে ভাগ করে দাও।</p>}

            <div className="actions">
              {viaShare ? (
                <button type="button" className="btn btn-primary export-go" onClick={shareAll}>
                  <PhotosIcon /> {phase === "done" ? "আবার সেভ করো" : `${bnNum(n)}টা ছবি Photos-এ রাখো`}
                </button>
              ) : (
                <button type="button" className="btn btn-primary export-go" onClick={() => saveAll(files)} disabled={phase === "saving"}>
                  <DownloadIcon /> {phase === "ready" ? `${bnNum(n)}টা ছবি নামাও` : "আবার নামাও"}
                </button>
              )}
              {shareable && !viaShare && (
                <button type="button" className="btn btn-ghost" onClick={shareAll} disabled={phase === "saving"}>
                  <ShareIcon /> Share
                </button>
              )}
            </div>

            {viaShare ? (
              <p className="note">যে তালিকাটা খুলবে, তাতে "Save Images" টিপলে সবকটা একসাথে Photos-এ চলে যাবে।</p>
            ) : (
              n > 1 && (
                <p className="export-tip">
                  প্রথমবার browser জিজ্ঞেস করতে পারে একসাথে অনেকগুলো ফাইল নামাতে দেবে কি না। <b>Allow</b> দিও, পরের বার থেকে আর জিজ্ঞেস করবে না। আগে Block দিয়ে থাকলে address bar-এর বাঁদিকের চিহ্নে টিপে "Automatic downloads" Allow করে নাও।
                </p>
              )
            )}
            <p className="note">কোনো একটা আলাদা করে চাইলে সেটায় ট্যাপ করো। প্রথমটাই cover।</p>
            <CaptionPick onToast={onToast} />
          </>
        )}
      </motion.div>
    </>
  );
}
