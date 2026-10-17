import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon, RestartIcon, ShareIcon, SwapIcon } from "../components/Icons";
import { TiltCard } from "../components/TiltCard";
import { EXPORT, LIMITS, PUJO_DAYS } from "../config";
import { bnNum } from "../lib/bn";
import { captionIdeas } from "../lib/captions";
import { dayLabel } from "../lib/days";
import { THEMES, toJpeg, type ThemeId } from "../lib/render/draw";
import { renderSlide } from "../lib/render/slide";
import { renderStory } from "../lib/render/story";
import { alternativesFor } from "../lib/select";
import { canShareFiles, downloadBlob, downloadZip, shareFiles, type ExportFile } from "../lib/share";
import { roastLines, type PujoStats } from "../lib/stats";
import type { Photo } from "../lib/types";
import { sceneLive } from "../three/store";

type Tab = "carousel" | "story" | "captions";
type Rendered = { url: string; blob: Blob };

const pad = (n: number) => String(n).padStart(2, "0");

function coverSubtitle(chosen: Photo[]): string {
  const keys = PUJO_DAYS.map((d) => d.key).filter((k) => chosen.some((p) => p.day === k));
  if (keys.length >= 2) return `${dayLabel(keys[0])} থেকে ${dayLabel(keys[keys.length - 1])}`;
  if (keys.length === 1) return dayLabel(keys[0])!;
  return "শারদীয়া ২০২৬";
}

export function Results(props: {
  photos: Photo[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  pickCount: number;
  onPickCount: (n: number) => void;
  stats: PujoStats;
  onRestart: () => void;
}) {
  const { photos, selected, setSelected, pickCount, onPickCount, stats, onRestart } = props;
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const chosen = useMemo(() => selected.map((id) => byId.get(id)!).filter(Boolean), [selected, byId]);

  const [tab, setTab] = useState<Tab>("carousel");
  const [theme, setTheme] = useState<ThemeId>("lalpar");
  const [coverTitle, setCoverTitle] = useState("পুজো ২০২৬");
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [slides, setSlides] = useState<Record<string, Rendered>>({});
  const [story, setStory] = useState<Rendered | null>(null);
  const cache = useRef(new Map<string, Rendered>());

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  }, []);

  const subtitle = useMemo(() => coverSubtitle(chosen), [chosen]);
  const keys = useMemo(
    () =>
      chosen.map((p, i) => {
        const edge = i === 0 || i === chosen.length - 1;
        return `${p.id}|${theme}|${i === 0 ? `cover:${coverTitle}:${subtitle}` : "plain"}|${edge ? "edge" : ""}`;
      }),
    [chosen, theme, coverTitle, subtitle],
  );

  // Render slides one by one; each pops into the coverflow when ready.
  useEffect(() => {
    let alive = true;
    const run = async () => {
      for (let i = 0; i < chosen.length; i++) {
        if (!alive) return;
        const key = keys[i];
        if (cache.current.has(key)) {
          const hit = cache.current.get(key)!;
          setSlides((s) => (s[key] ? s : { ...s, [key]: hit }));
          continue;
        }
        const canvas = await renderSlide(chosen[i], {
          theme,
          index: i,
          total: chosen.length,
          cover: i === 0 ? { title: coverTitle, subtitle } : undefined,
        });
        const blob = await toJpeg(canvas, EXPORT.jpegQuality);
        const r = { blob, url: URL.createObjectURL(blob) };
        cache.current.set(key, r);
        if (alive) setSlides((s) => ({ ...s, [key]: r }));
      }
    };
    const id = window.setTimeout(run, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [keys, chosen, theme, coverTitle, subtitle]);

  useEffect(() => {
    const c = cache.current;
    return () => c.forEach((r) => URL.revokeObjectURL(r.url));
  }, []);

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

  const ready = keys.every((k) => slides[k]);
  const exportFiles: ExportFile[] = ready ? keys.map((k, i) => ({ name: `pujo-2026-${pad(i + 1)}.jpg`, blob: slides[k].blob })) : [];
  const captions = useMemo(() => captionIdeas(stats, chosen.length), [stats, chosen.length]);
  const shareable = ready && canShareFiles(exportFiles.slice(0, 1));

  const shareAll = async () => {
    if (!ready) return;
    if (canShareFiles(exportFiles)) {
      const r = await shareFiles(exportFiles, captions[0]);
      if (r === "failed") {
        await downloadZip(exportFiles, "pujo-2026-carousel.zip");
        showToast("শেয়ার হল না, ZIP নামিয়ে দিলাম");
      }
    } else {
      await downloadZip(exportFiles, "pujo-2026-carousel.zip");
      showToast("ZIP নেমে গেছে");
    }
  };

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

  const replace = (oldId: string, newId: string) => {
    setSelected(selected.map((id) => (id === oldId ? newId : id)));
    setSwapFor(null);
  };

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
              ["carousel", "ক্যারোসেল"],
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
            {tab === "carousel" && (
              <>
                <div className="toolbar">
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
                  <div className="field">
                    <span>ফ্রেম</span>
                    <div className="pills">
                      {Object.values(THEMES).map((t) => (
                        <button key={t.id} className="pill" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="field">
                    <span>প্রথম ছবির লেখা</span>
                    <input
                      className="text-input"
                      value={coverTitle}
                      maxLength={18}
                      onChange={(e) => setCoverTitle(e.target.value)}
                    />
                  </label>
                </div>

                <Coverflow>
                  {chosen.map((p, i) => {
                    const r = slides[keys[i]];
                    return (
                      <div className="slide" key={p.id}>
                        <span className="slide-index">
                          {bnNum(i + 1)}/{bnNum(chosen.length)}
                        </span>
                        <div className="slide-img">
                          {r ? (
                            <motion.img
                              key={r.url}
                              src={r.url}
                              alt={`স্লাইড ${bnNum(i + 1)}`}
                              initial={{ opacity: 0, scale: 1.04 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.4 }}
                            />
                          ) : (
                            <>
                              <img className="placeholder" src={p.thumbUrl} alt="" />
                              <div className="busy">সাজাচ্ছি…</div>
                            </>
                          )}
                        </div>
                        <div className="slide-tools">
                          <button className="slide-tool" onClick={() => setSwapFor(p.id)}>
                            <SwapIcon /> বদলাও
                          </button>
                          <button
                            className="slide-tool"
                            disabled={!r}
                            onClick={() => r && downloadBlob(r.blob, `pujo-2026-${pad(i + 1)}.jpg`)}
                          >
                            <DownloadIcon /> নামাও
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </Coverflow>

                <div className="actions">
                  <motion.button
                    className="btn btn-primary"
                    disabled={!ready}
                    onClick={shareAll}
                    whileHover={{ scale: ready ? 1.03 : 1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <ShareIcon />
                    {!ready ? "সাজানো চলছে…" : shareable ? "সব ছবি শেয়ার করো" : "সব ছবি নামাও (ZIP)"}
                  </motion.button>
                  {shareable && (
                    <button className="btn btn-ghost" onClick={() => downloadZip(exportFiles, "pujo-2026-carousel.zip")}>
                      <DownloadIcon /> ZIP নামাও
                    </button>
                  )}
                </div>
                <p className="note">
                  Instagram-এ পোস্ট করার সময় trending গান লাগিয়ে দিও। প্রথম ছবিটাই cover, তাই সেরাটা সামনে রেখেছি।
                </p>
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

      <AnimatePresence>
        {swapFor && (
          <SwapSheet
            key="sheet"
            options={alternativesFor(photos, selected, swapFor)}
            onPick={(id) => replace(swapFor, id)}
            onClose={() => setSwapFor(null)}
          />
        )}
      </AnimatePresence>

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

// Horizontal scroller where off-centre slides turn away in 3D.
function Coverflow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    for (const child of Array.from(el.children) as HTMLElement[]) {
      const center = child.offsetLeft + child.offsetWidth / 2;
      const d = (center - mid) / child.offsetWidth;
      const ad = Math.min(Math.abs(d), 2.5);
      child.style.transform = `rotateY(${Math.max(-50, Math.min(50, -d * 32))}deg) translateZ(${-ad * 60}px) scale(${1 - ad * 0.06})`;
      child.style.opacity = String(1 - Math.min(ad, 2.5) * 0.18);
      child.style.zIndex = String(100 - Math.round(ad * 10));
    }
  }, []);

  useLayoutEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [update]);

  useEffect(() => {
    update();
  });

  return (
    <div className="coverflow" ref={ref}>
      {children}
    </div>
  );
}

function SwapSheet({ options, onPick, onClose }: { options: Photo[]; onPick: (id: string) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="sheet"
        role="dialog"
        aria-label="ছবি বদলাও"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
      >
        <h3>কোনটা দেবে?</h3>
        <p>একই দিনের ভালো ছবিগুলো আগে দেখাচ্ছি।</p>
        {options.length ? (
          <div className="alt-grid">
            {options.map((p, i) => (
              <motion.button
                key={p.id}
                className="alt"
                onClick={() => onPick(p.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.04 }}
              >
                <img src={p.thumbUrl} alt="" loading="lazy" />
                {dayLabel(p.day) && <span>{dayLabel(p.day)}</span>}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="empty">আর কোনো ছবি বাকি নেই।</div>
        )}
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn btn-ghost btn-small" onClick={onClose}>
            থাক, বন্ধ করো
          </button>
        </div>
      </motion.div>
    </>
  );
}
