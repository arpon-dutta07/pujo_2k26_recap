import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CopyIcon, DownloadIcon, EditIcon, RestartIcon, ShareIcon } from "../components/Icons";
import { TiltCard } from "../components/TiltCard";
import { EXPORT, LIMITS } from "../config";
import { ExportSheet } from "../editor/ExportSheet";
import { PageView } from "../editor/PageView";
import { clearPhotoPreviews } from "../editor/photos";
import { buildProject, historyReducer } from "../editor/project";
import { Studio } from "../editor/Studio";
import "../editor/studio.css";
import { defaultFormat, templateById } from "../editor/templates";
import { bnNum } from "../lib/bn";
import { captionIdeas } from "../lib/captions";
import { DAY_ORDER } from "../lib/days";
import { toJpeg } from "../lib/render/draw";
import { renderStory } from "../lib/render/story";
import { canShareFiles, downloadBlob, shareFiles } from "../lib/share";
import { roastLines, type PujoStats } from "../lib/stats";
import type { Photo } from "../lib/types";
import { sceneLive } from "../three/store";

type Tab = "templates" | "story" | "captions";
type Rendered = { url: string; blob: Blob };

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
  const [story, setStory] = useState<Rendered | null>(null);
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

  const lines = useMemo(() => roastLines(stats), [stats]);
  const heroes = useMemo(() => [...chosen].sort((a, b) => b.score - a.score).slice(0, 3), [chosen]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const canvas = await renderStory(stats, lines, heroes);
      const blob = await toJpeg(canvas, EXPORT.jpegQuality);
      if (!alive) return;
      setStory((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    })();
    return () => {
      alive = false;
    };
  }, [stats, lines, heroes]);

  const captions = useMemo(() => captionIdeas(stats, chosen.length), [stats, chosen.length]);

  const shareStory = async () => {
    if (!story) return;
    const file = [{ name: "pujor-hisheb.jpg", blob: story.blob }];
    if (canShareFiles(file)) {
      const r = await shareFiles(file);
      if (r !== "failed") return;
    }
    downloadBlob(story.blob, "pujor-hisheb.jpg");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("কপি হয়ে গেছে");
    } catch {
      showToast("কপি হল না, হাতে সিলেক্ট করে নাও");
    }
  };

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
        <div className="tabs" role="tablist">
          {(
            [
              ["templates", "টেমপ্লেট"],
              ["story", "পুজোর হিসেব"],
              ["captions", "ক্যাপশন"],
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
                    <h3>তোমার carousel সাজানো আছে</h3>
                    <p>
                      AI সেরা ছবিগুলো টেমপ্লেটে বসিয়ে দিয়েছে। যেকোনো পাতায় ট্যাপ করে বদলাও: ছবি, টেমপ্লেট, স্টিকার, লেখা। পছন্দ না হলে নিজের ফোন থেকেও
                      ছবি দিতে পারো।
                    </p>
                  </div>
                  <div className="field">
                    <span>AI কটা ছবি বাছবে</span>
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
                    এডিটরে খোলো
                  </motion.button>
                  <button className="btn btn-ghost" onClick={() => setExporting(true)}>
                    <ShareIcon /> এখনই শেয়ার করো ({bnNum(slideCount)}টা ছবি)
                  </button>
                </div>
                <p className="note">Instagram-এ পোস্ট করার সময় trending গান লাগিয়ে দিও। প্রথম ছবিটাই cover, তাই সেরাটা সামনে রেখেছি।</p>
              </>
            )}

            {tab === "story" && (
              <div className="story-wrap">
                <TiltCard max={12}>
                  {story ? (
                    <img src={story.url} alt="এবারের পুজোর হিসেব" />
                  ) : (
                    <div className="slide-img" style={{ aspectRatio: "9 / 16", display: "grid", placeItems: "center" }}>
                      <span style={{ color: "var(--gold)" }}>হিসেব কষছি…</span>
                    </div>
                  )}
                </TiltCard>
                <div>
                  <h2 className="section-title">এবারের পুজোর হিসেব</h2>
                  <ul className="story-lines">
                    {lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li>ছবি কম, তাই হিসেবও ছোট। পরের বার আরও তুলো!</li>}
                  </ul>
                  <div className="actions" style={{ justifyContent: "flex-start" }}>
                    <motion.button className="btn btn-primary" disabled={!story} onClick={shareStory} whileTap={{ scale: 0.97 }}>
                      <ShareIcon /> স্টোরিতে দাও
                    </motion.button>
                    <button className="btn btn-ghost" disabled={!story} onClick={() => story && downloadBlob(story.blob, "pujor-hisheb.jpg")}>
                      <DownloadIcon /> নামাও
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "captions" && (
              <div className="captions">
                {captions.map((c, i) => (
                  <motion.div
                    key={c}
                    className="caption-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div>{c}</div>
                    <button className="btn btn-ghost btn-small" onClick={() => copy(c)}>
                      <CopyIcon /> কপি করো
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="actions" style={{ marginTop: 30 }}>
          <button className="btn btn-ghost btn-small" onClick={onRestart}>
            <RestartIcon /> নতুন ছবি দিয়ে আবার
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
                caption={captions[0]}
                startPage={studio}
                onClose={() => setStudio(null)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {exporting && (
              <ExportSheet key="export" project={project} photo={photo} caption={captions[0]} onClose={() => setExporting(false)} onToast={showToast} />
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
        <p>টেনে ঘোরাও · নিচে Instagram-রেডি ছবি</p>
      </motion.div>
    </div>
  );
}
