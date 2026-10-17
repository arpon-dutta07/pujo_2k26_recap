import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DiyaIcon } from "./components/Icons";
import { LIMITS, SITE } from "./config";
import { analyzePhotos } from "./lib/analyze";
import { dayLabel } from "./lib/days";
import { selectBest } from "./lib/select";
import { computeStats } from "./lib/stats";
import type { Photo, Progress } from "./lib/types";
import { loadFaceModel } from "./lib/faces";
import { Landing } from "./screens/Landing";
import { Processing } from "./screens/Processing";
import { Results } from "./screens/Results";
import { Scene } from "./three/Scene";
import { pushFeed, setScene } from "./three/store";

type Stage = "landing" | "processing" | "results" | "error";

const StaticScene = memo(Scene);

// Opacity and a small lift only: a full-page blur filter is too heavy while the
// analysis is keeping the main thread busy.
const screen = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pickCount, setPickCount] = useState(LIMITS.defaultPick);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const stats = useMemo(() => (photos.length ? computeStats(photos) : null), [photos]);

  const reset = useCallback(() => {
    abort.current?.abort();
    photos.forEach((p) => p.thumbUrl && URL.revokeObjectURL(p.thumbUrl));
    setPhotos([]);
    setSelected([]);
    setProgress(null);
    setError(null);
    setScene({ mode: "hero", ring: [] });
    setStage("landing");
    window.scrollTo({ top: 0 });
  }, [photos]);

  const handleFiles = useCallback(async (input: File[]) => {
    const images = input.filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (!images.length) return;
    const files = images.slice(0, LIMITS.maxPhotos);
    window.scrollTo({ top: 0 });
    setStage("processing");
    setScene({ mode: "processing", ring: [] });
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      // Let the panel arrive and the placeholder cards fall into the flame first.
      await new Promise((r) => setTimeout(r, 800));
      if (ctrl.signal.aborted) return;
      const result = await analyzePhotos(
        files,
        {
          onProgress: setProgress,
          onPhoto: (photo, thumb) =>
            pushFeed({ canvas: thumb, verdict: photo.status === "ok" ? "ok" : photo.status === "duplicate" ? "duplicate" : "blurry" }),
        },
        ctrl.signal,
      );
      const readable = result.filter((p) => p.status !== "unreadable");
      if (!readable.length) {
        setError(
          "একটাও ছবি খোলা গেল না। iPhone-এর HEIC ছবি হলে Settings > Camera > Formats-এ গিয়ে 'Most Compatible' করে দেখো, বা ফোন থেকেই সাইটটা খোলো।",
        );
        setStage("error");
        setScene({ mode: "hero" });
        return;
      }
      setPhotos(result);
      setSelected(selectBest(result, LIMITS.defaultPick));
      setPickCount(LIMITS.defaultPick);
      // Let the last cards finish their trip through the flame.
      await new Promise((r) => setTimeout(r, 1400));
      if (ctrl.signal.aborted) return;
      setScene({ mode: "results" });
      setStage("results");
      window.scrollTo({ top: 0 });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      console.error(err);
      setError("কিছু একটা গোলমাল হল। পেজটা রিফ্রেশ করে আবার চেষ্টা করো।");
      setStage("error");
      setScene({ mode: "hero" });
    }
  }, []);

  // The 3D ring always mirrors the current selection.
  useEffect(() => {
    if (stage !== "results") return;
    const byId = new Map(photos.map((p) => [p.id, p]));
    setScene({
      ring: selected.map((id) => byId.get(id)!).filter(Boolean).map((p) => ({ url: p.thumbUrl, label: dayLabel(p.day) })),
    });
  }, [selected, photos, stage]);

  // Start downloading the face model (about 7 MB) while people read the landing page,
  // but only on a fast connection that hasn't asked to save data.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || (conn?.effectiveType && conn.effectiveType !== "4g")) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void loadFaceModel());
  }, []);

  // Drag and drop anywhere on the landing page.
  useEffect(() => {
    if (stage !== "landing") return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void handleFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [stage, handleFiles]);

  // Dev-only hook so the flow can be driven without a file picker.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __pujoTest: (urls: string[]) => Promise<void> }).__pujoTest = async (urls) => {
      const files = await Promise.all(
        urls.map(async (u, i) => {
          const blob = await (await fetch(u)).blob();
          return new File([blob], u.split("/").pop() ?? `t${i}.jpg`, { type: blob.type, lastModified: Date.now() });
        }),
      );
      await handleFiles(files);
    };
  }, [handleFiles]);

  const changeCount = (n: number) => {
    setPickCount(n);
    setSelected(selectBest(photos, n));
  };

  return (
    <>
      <StaticScene />
      <div className="app">
        <header className="topbar">
          <button className="brand" onClick={stage === "processing" ? undefined : reset} aria-label={`${SITE.name}, শুরুতে ফেরো`}>
            <DiyaIcon />
            {SITE.name}
          </button>
        </header>

        <AnimatePresence mode="wait">
          {stage === "landing" && (
            <motion.main key="landing" {...screen}>
              <Landing onFiles={handleFiles} />
            </motion.main>
          )}
          {stage === "processing" && (
            <motion.main key="processing" {...screen}>
              <Processing progress={progress} onCancel={reset} />
            </motion.main>
          )}
          {stage === "results" && stats && (
            <motion.main key="results" {...screen}>
              <Results
                photos={photos}
                selected={selected}
                pickCount={pickCount}
                onPickCount={changeCount}
                stats={stats}
                onRestart={reset}
              />
            </motion.main>
          )}
          {stage === "error" && (
            <motion.main key="error" {...screen} className="processing">
              <div className="process-panel">
                <h2>উফ!</h2>
                <p className="fun-line">{error}</p>
                <button className="btn btn-primary" onClick={reset}>
                  আবার চেষ্টা করো
                </button>
              </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div className="drop-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            ছেড়ে দাও, ঝুলিতে ভরছি
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
