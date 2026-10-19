import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, EditIcon, PlayIcon, RestartIcon, ShareIcon } from "../components/Icons";
import { LIMITS } from "../config";
import { ExportSheet } from "../editor/ExportSheet";
import { PageView } from "../editor/PageView";
import { clearPhotoPreviews } from "../editor/photos";
import { buildProject, historyReducer } from "../editor/project";
import { Studio } from "../editor/Studio";
import "../editor/studio.css";
import { defaultFormat, templateById } from "../editor/templates";
import { bnNum } from "../lib/bn";
import { DAY_ORDER } from "../lib/days";
import type { PujoStats } from "../lib/stats";
import type { Photo } from "../lib/types";
import { recapFacts } from "../recap/facts";
import { RecapPlayer } from "../recap/Player";
import { SlideView } from "../recap/SlideView";
import { buildRecap } from "../recap/slides";
import { SLIDE_W, type Slide } from "../recap/types";
import { sceneLive } from "../three/store";

type Tab = "templates" | "story";

export function Results(props: {
  photos: Photo[];
  selected: string[];
  pickCount: number;
  onPickCount: (n: number) => void;
  stats: PujoStats;
  onRestart: () => void;
}) {
  const { photos, selected, pickCount, onPickCount, stats, onRestart } = props;
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const chosen = useMemo(() => selected.map((id) => byId.get(id)!).filter(Boolean), [selected, byId]);

  const [tab, setTab] = useState<Tab>("templates");
  const [toast, setToast] = useState<string | null>(null);
  // The recap story: which slide it is open on, or null when closed.
  const [recap, setRecap] = useState<number | null>(null);
  const [extras, setExtras] = useState<Photo[]>([]);
  const [studio, setStudio] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  }, []);

  // Every photo the studio may use: the analysed ones plus any added there.
  const allById = useMemo(() => new Map([...photos, ...extras].map((p) => [p.id, p])), [photos, extras]);
  const photo = useCallback((id: string) => allById.get(id), [allById]);
  const rest = useMemo(() => {
    const picked = new Set(selected);
    const order = new Map(DAY_ORDER.map((d, i) => [d, i]));
    return photos
      .filter((p) => p.status !== "unreadable" && !picked.has(p.id))
      .sort(
        (a, b) =>
          (order.get(a.day ?? "unknown") ?? 99) - (order.get(b.day ?? "unknown") ?? 99) ||
          Number(a.status !== "ok") - Number(b.status !== "ok") ||
          b.score - a.score,
      );
  }, [photos, selected]);

  // The carousel the site builds on its own. Changing "কটা ছবি" builds it
  // again (undo brings the old one back).
  // Good photos the AI did not pick, best first: they top up a last page.
  const spare = useMemo(() => rest.filter((p) => p.status === "ok").sort((a, b) => b.score - a.score), [rest]);
  const [hist, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: buildProject(chosen, defaultFormat(), spare),
    future: [],
  }));
  const built = useRef(selected);
  useEffect(() => {
    if (built.current === selected) return;
    built.current = selected;
    dispatch({ type: "set", project: buildProject(chosen, hist.present.format, spare) });
    // only when the AI's choice changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  const project = hist.present;

  const extrasRef = useRef(extras);
  extrasRef.current = extras;
  useEffect(
    () => () => {
      extrasRef.current.forEach((p) => URL.revokeObjectURL(p.thumbUrl));
      clearPhotoPreviews();
    },
    [],
  );

  const slides = useMemo(() => buildRecap(recapFacts(photos, selected, stats)), [photos, selected, stats]);
  // Plays once by itself when the results arrive, like a year-end recap.
  useEffect(() => {
    const id = window.setTimeout(() => setRecap(0), 1600);
    return () => window.clearTimeout(id);
  }, []);

  const slideCount = project.pages.reduce((n, p) => n + (templateById(p.template).span ?? 1), 0);

  return (
    <div className="results">
      <RingStage count={chosen.length} />

      <motion.div
        className="results-body"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <button className="recap-banner" onClick={() => setRecap(0)}>
          <span className="recap-banner-art" aria-hidden="true">
            <Thumb slide={slides[0]} />
          </span>
          <span>
            <b>তোমার পুজোর হিসেব রেডি</b>
            <small>{bnNum(slides.length)}টা স্লাইড, story-তে দেওয়ার মতো</small>
          </span>
          <span className="recap-play">
            <PlayIcon />
          </span>
        </button>

        <div className="tabs" role="tablist">
          {(
            [
              ["templates", "Carousel"],
              ["story", "পুজোর হিসেব"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
              {tab === id && <motion.span layoutId="tab-underline" className="tab-underline" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
          >
            {tab === "templates" && (
              <>
                <div className="proj-intro">
                  <div>
                    <h3>Carousel রেডি</h3>
                    <p>
                      কোনো পাতা পছন্দ না হলে ট্যাপ করো। ছবি, টেমপ্লেট, স্টিকার, লেখা, সব বদলানো যায়।
                    </p>
                  </div>
                  <div className="field">
                    <span>কটা ছবি</span>
                    <div className="pills">
                      {LIMITS.pickOptions.map((n) => (
                        <button key={n} className="pill" aria-pressed={pickCount === n} onClick={() => onPickCount(n)}>
                          {bnNum(n)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="proj-strip">
                  {project.pages.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className="proj-page"
                      style={{ ["--span" as string]: templateById(p.template).span ?? 1 }}
                      onClick={() => setStudio(i)}
                      aria-label={`পাতা ${bnNum(i + 1)} এডিট করো`}
                    >
                      <PageView
                        page={p}
                        format={project.format}
                        photo={photo}
                      />
                      <span className="proj-label">
                        {bnNum(i + 1)}. {templateById(p.template).name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="actions">
                  <motion.button className="btn btn-primary" onClick={() => setStudio(0)} whileTap={{ scale: 0.97 }}>
                    <EditIcon />
                    Edit
                  </motion.button>
                  <button className="btn btn-ghost" onClick={() => setExporting(true)}>
                    <ShareIcon /> Share ({bnNum(slideCount)}টা ছবি)
                  </button>
                </div>
                <p className="note">প্রথম ছবিটাই cover হবে, তাই সেরাটা সামনে রেখেছি।</p>
              </>
            )}

            {tab === "story" && (
              <>
                <div className="recap-grid">
                  {slides.map((sl, k) => (
                    <button key={sl.id} className="recap-thumb" onClick={() => setRecap(k)} aria-label={`স্লাইড ${bnNum(k + 1)} দেখো`}>
                      <span>{bnNum(k + 1)}</span>
                      <Thumb slide={sl} />
                    </button>
                  ))}
                </div>
                <div className="actions" style={{ marginTop: 22 }}>
                  <motion.button className="btn btn-primary" onClick={() => setRecap(0)} whileTap={{ scale: 0.97 }}>
                    <PlayIcon /> Play
                  </motion.button>
                </div>
                <p className="note">যে স্লাইড ভালো লাগে, চালিয়ে Share টিপে দাও।</p>
              </>
            )}

          </motion.div>
        </AnimatePresence>

        <div className="actions" style={{ marginTop: 30 }}>
          <button className="btn btn-ghost btn-small" onClick={onRestart}>
            <RestartIcon /> নতুন করে শুরু
          </button>
        </div>
      </motion.div>

      {createPortal(
        <>
          <AnimatePresence>
            {studio !== null && (
              <Studio
                key="studio"
                project={project}
                dispatch={dispatch}
                canUndo={hist.past.length > 0}
                canRedo={hist.future.length > 0}
                photo={photo}
                ai={chosen}
                mine={extras}
                rest={rest}
                onAddPhotos={(list) => setExtras((x) => [...list, ...x])}
                startPage={studio}
                onClose={() => setStudio(null)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {recap !== null && <RecapPlayer key="recap" slides={slides} start={recap} onClose={() => setRecap(null)} />}
          </AnimatePresence>
          <AnimatePresence>
            {exporting && (
              <ExportSheet key="export" project={project} photo={photo} onClose={() => setExporting(false)} onToast={showToast} />
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <CheckIcon style={{ width: 18, height: 18, verticalAlign: "-3px", marginRight: 6 }} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// A recap slide at thumbnail size, in its final state.
function Thumb({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null);
  const [u, setU] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setU(el.clientWidth / SLIDE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      {u > 0 && <SlideView slide={slide} u={u} still />}
    </div>
  );
}

// Transparent band over the 3D ring: drag sideways to spin it.
function RingStage({ count }: { count: number }) {
  const last = useRef<{ x: number; t: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    last.current = { x: e.clientX, t: performance.now() };
    sceneLive.spin.dragging = true;
  };
  const onMove = (e: React.PointerEvent) => {
    if (!last.current) return;
    const now = performance.now();
    const dx = e.clientX - last.current.x;
    const dt = Math.max(8, now - last.current.t) / 1000;
    sceneLive.spin.velocity = Math.max(-6, Math.min(6, (dx / window.innerWidth) * 6 / dt * 0.35));
    last.current = { x: e.clientX, t: now };
  };
  const onUp = () => {
    last.current = null;
    sceneLive.spin.dragging = false;
  };
  return (
    <div
      className="ring-stage"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
    >
      <motion.div
        className="ring-caption"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <h2>তোমার সেরা {bnNum(count)}টা</h2>
        <p>Drag করে ঘুরিয়ে দেখো</p>
      </motion.div>
    </div>
  );
}
