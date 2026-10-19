// পুজোর ঝুলি: a Pujo moodboard maker. The visitor adds photos, sees them in
// every moodboard, opens one in the studio, and each moodboard they open
// becomes a page in their ঝুলি (bag), shared together at the end.
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BagIcon, DiyaIcon } from "./components/Icons";
import { LIMITS, SITE } from "./config";
import { historyReducer, makePage, usedPhotoIds, type History } from "./editor/project";
import { Studio } from "./editor/Studio";
import "./editor/studio.css";
import { bnNum } from "./lib/bn";
import { importPhoto, isImage } from "./lib/photos";
import type { Photo } from "./lib/types";
import { Landing } from "./screens/Landing";
import { Scene } from "./three/Scene";
import { setScene } from "./three/store";

const StaticScene = memo(Scene);
const EMPTY: History = { past: [], present: { format: "story", pages: [] }, future: [] };

// Small pictures of the visitor's photos for the orbiting 3D polaroids.
async function picturesOf(photos: Photo[]) {
  const out = await Promise.all(
    photos.slice(-24).map(
      (p) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = p.thumbUrl;
        }),
    ),
  );
  return out.filter((x): x is HTMLImageElement => !!x);
}

export function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [adding, setAdding] = useState(0);
  const [hist, dispatch] = useReducer(historyReducer, EMPTY);
  const [studio, setStudio] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const seq = useRef(0);
  const project = hist.present;
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const photo = useCallback((id: string) => byId.get(id), [byId]);

  const addPhotos = useCallback(async (input: File[]) => {
    const files = input.filter(isImage).slice(0, LIMITS.maxPhotos);
    if (!files.length) return;
    setAdding(files.length);
    for (const f of files) {
      const n = ++seq.current;
      const p = await importPhoto(f, `p${n}-${Date.now().toString(36)}`, n).catch(() => null);
      if (p) setPhotos((prev) => [...prev, p]);
      setAdding((a) => Math.max(0, a - 1));
    }
    setAdding(0);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.thumbUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  // The 3D polaroids in the hero show the visitor's photos once there are some.
  useEffect(() => {
    let alive = true;
    void picturesOf(photos).then((pictures) => alive && setScene({ pictures }));
    return () => {
      alive = false;
    };
  }, [photos]);

  // A moodboard picked in the gallery becomes a new page in the bag, filled
  // with photos not used on another page yet, and opens in the studio.
  const start = useCallback(
    (templateId: string) => {
      const used = usedPhotoIds(project);
      const pool = [...photos.filter((p) => !used.has(p.id)), ...photos.filter((p) => used.has(p.id))];
      const page = makePage(templateId, project.format, pool);
      dispatch({ type: "set", project: { ...project, pages: [...project.pages, page] } });
      setStudio(project.pages.length);
    },
    [project, photos],
  );

  // Drag and drop anywhere while the studio is closed.
  useEffect(() => {
    if (studio !== null) return;
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
      document.getElementById("moodboards")?.scrollIntoView({ behavior: "smooth" });
      void addPhotos(Array.from(e.dataTransfer?.files ?? []));
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
  }, [studio, addPhotos]);

  // Dev-only hook so the flow can be driven without a file picker.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __pujoAdd: (urls: string[]) => Promise<void> }).__pujoAdd = async (urls) => {
      const files = await Promise.all(
        urls.map(async (u, i) => {
          const blob = await (await fetch(u)).blob();
          return new File([blob], u.split("/").pop() ?? `t${i}.jpg`, { type: blob.type, lastModified: Date.now() });
        }),
      );
      await addPhotos(files);
    };
  }, [addPhotos]);

  const pages = project.pages.length;

  return (
    <>
      <StaticScene />
      <div className="app">
        <header className="topbar">
          <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={`${SITE.name}, উপরে যাও`}>
            <DiyaIcon />
            {SITE.name}
          </button>
        </header>
        <main>
          <Landing photos={photos} adding={adding} onFiles={addPhotos} onRemovePhoto={removePhoto} onStart={start} />
        </main>
      </div>

      <AnimatePresence>
        {pages > 0 && studio === null && (
          <motion.button
            className="bag-btn"
            onClick={() => setStudio(pages - 1)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.94 }}
            aria-label={`তোমার ঝুলি, ${bnNum(pages)}টা পাতা`}
          >
            <BagIcon />
            <span>ঝুলি</span>
            <motion.b key={pages} initial={{ scale: 1.9 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 9, stiffness: 300 }}>
              {bnNum(pages)}
            </motion.b>
          </motion.button>
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {studio !== null && pages > 0 && (
            <Studio
              key="studio"
              project={project}
              dispatch={dispatch}
              canUndo={hist.past.length > 0}
              canRedo={hist.future.length > 0}
              photo={photo}
              photos={photos}
              onAddPhotos={(list) => setPhotos((x) => [...x, ...list])}
              startPage={studio}
              onClose={() => setStudio(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

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
