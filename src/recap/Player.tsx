// The recap as a story: full screen, progress bars on top, tap the right
// side for the next slide and the left for the last one, hold to pause.
// Each slide is also drawn as a JPEG in the background, so sharing is
// instant: one slide to an Instagram story, or all of them to WhatsApp.
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, RestartIcon, ShareIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import { ensureFonts } from "../lib/render/draw";
import { canShareFiles, downloadBlob, downloadZip, shareFiles, type ExportFile } from "../lib/share";
import { setScene } from "../three/store";
import { paintSlide, releasePictures, slideToJpeg, type Picture } from "./paint";
import { SlideView } from "./SlideView";
import { SLIDE_W, type Slide } from "./types";
import "./recap.css";

const pad2 = (n: number) => String(n).padStart(2, "0");
const fileName = (k: number) => `pujor-hisheb-${pad2(k + 1)}.jpg`;
const idle = () => new Promise<void>((r) => (window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 600 }) : setTimeout(r, 120)));

// JPEGs of every slide, made one after another while the story plays.
function useSlideImages(slides: Slide[], start: boolean) {
  const [done, setDone] = useState(0);
  const jobs = useRef(new Map<number, Promise<Blob>>());
  const pictures = useRef(new Map<string, Picture>());
  const render = useCallback(
    (k: number) => {
      let job = jobs.current.get(k);
      if (!job) {
        job = paintSlide(slides[k], pictures.current).then((c) => {
          const out = slideToJpeg(c);
          void out.then(() => setDone((d) => d + 1));
          return out;
        });
        jobs.current.set(k, job);
      }
      return job;
    },
    [slides],
  );
  useEffect(() => {
    if (!start) return;
    let alive = true;
    const cache = pictures.current;
    void (async () => {
      await new Promise((r) => setTimeout(r, 1800)); // let the first slide play smoothly
      for (let k = 0; k < slides.length && alive; k++) {
        await render(k).catch(() => null);
        await idle();
      }
      if (alive) releasePictures(cache);
    })();
    return () => {
      alive = false;
    };
  }, [start, render, slides.length]);
  useEffect(() => () => releasePictures(pictures.current), []);
  return { render, done };
}

export function RecapPlayer({ slides, start = 0, onClose }: { slides: Slide[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [u, setU] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const elapsed = useRef(0);
  const press = useRef<{ t: number; x: number } | null>(null);
  const images = useSlideImages(slides, ready);
  const last = slides.length - 1;
  const slide = slides[i];

  const go = useCallback(
    (n: number) => {
      elapsed.current = 0;
      progress.set(0);
      setEnded(false);
      setI(Math.max(0, Math.min(last, n)));
    },
    [last, progress],
  );

  useEffect(() => {
    void ensureFonts().then(() => setReady(true));
  }, []);

  // While open: no page scroll behind, and the 3D scene stops drawing.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setScene({ hold: true });
    return () => {
      document.body.style.overflow = before;
      setScene({ hold: false });
    };
  }, []);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setU(el.clientWidth / SLIDE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The clock: fills the current bar and moves on when it is full.
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let before = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - before) / 1000);
      before = t;
      if (!paused && !ended && !busy) {
        elapsed.current += dt;
        progress.set(Math.min(1, elapsed.current / slide.duration));
        if (elapsed.current >= slide.duration) {
          if (i < last) go(i + 1);
          else setEnded(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, paused, ended, busy, i, last, slide.duration, go, progress]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, onClose]);

  const onDown = (e: PointerEvent) => {
    press.current = { t: performance.now(), x: e.clientX };
    setPaused(true);
  };
  const onUp = (e: PointerEvent) => {
    const p = press.current;
    press.current = null;
    setPaused(false);
    if (!p || performance.now() - p.t > 280) return; // that was a hold
    const r = frame.current!.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.3) go(i - 1);
    else if (i < last) go(i + 1);
    else setEnded(true);
  };
  const keep = (e: PointerEvent) => e.stopPropagation();

  const deliver = async (files: ExportFile[]) => {
    if (canShareFiles(files)) {
      const r = await shareFiles(files);
      if (r !== "failed") return;
    }
    if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
    else await downloadZip(files, "pujor-hisheb.zip");
  };

  const shareOne = async () => {
    setBusy("একটু দাঁড়াও…");
    try {
      const blob = await images.render(i);
      await deliver([{ name: fileName(i), blob }]);
    } finally {
      setBusy(null);
    }
  };

  const shareAll = async () => {
    setBusy("সব স্লাইড রেডি করছি…");
    try {
      const blobs = await Promise.all(slides.map((_, k) => images.render(k)));
      await deliver(blobs.map((blob, k) => ({ name: fileName(k), blob })));
    } finally {
      setBusy(null);
    }
  };

  return createPortal(
    <motion.div className="rc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="পুজোর হিসেব">
      <button className="rc-side rc-prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="আগের স্লাইড">
        <ArrowLeftIcon />
      </button>

      <motion.div
        className="rc-frame"
        ref={frame}
        data-dark={slide.dark || undefined}
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 200 }}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => {
          press.current = null;
          setPaused(false);
        }}
      >
        <AnimatePresence initial={false}>
          {ready && u > 0 && (
            <motion.div
              key={slide.id}
              className="rc-stage"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <SlideView slide={slide} u={u} />
            </motion.div>
          )}
        </AnimatePresence>
        {!ready && <div className="rc-wait">হিসেব কষছি…</div>}

        <div className="rc-bars" aria-hidden="true">
          {slides.map((s, k) => (
            <span key={s.id} className="rc-seg">
              <motion.i style={{ scaleX: k < i ? 1 : k > i ? 0 : progress }} />
            </span>
          ))}
        </div>

        <div className="rc-top" onPointerDown={keep} onPointerUp={keep}>
          <span className="rc-count">
            {bnNum(i + 1)}/{bnNum(slides.length)}
          </span>
          <button className="rc-icon" onClick={onClose} aria-label="বন্ধ করো">
            <CloseIcon />
          </button>
        </div>

        <div className="rc-actions" onPointerDown={keep} onPointerUp={keep}>
          {ended && (
            <motion.button className="rc-btn rc-btn-ghost" onClick={() => go(0)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <RestartIcon /> Replay
            </motion.button>
          )}
          <button className="rc-btn" onClick={shareOne} disabled={!!busy}>
            <ShareIcon /> Share
          </button>
          <button className="rc-btn rc-btn-ghost" onClick={shareAll} disabled={!!busy}>
            Share all
          </button>
        </div>

        <AnimatePresence>
          {busy && (
            <motion.div className="rc-busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {busy}
              {images.done < slides.length && busy.startsWith("সব") ? ` ${bnNum(images.done)}/${bnNum(slides.length)}` : ""}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <button className="rc-side rc-next" onClick={() => (i < last ? go(i + 1) : setEnded(true))} aria-label="পরের স্লাইড">
        <ArrowRightIcon />
      </button>
    </motion.div>,
    document.body,
  );
}
