// The whole site in three steps, played out with real Pujo photos: a pile
// of shots, the check stamping out look-alikes and blurry ones, and the
// keepers landing in a moodboard. Plays by itself while on screen; tapping
// a step jumps there and holds it for a while.
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "../../components/Icons";
import { bnNum } from "../../lib/bn";
import { SAMPLE } from "./photos";
import { TemplatePreview } from "./TemplatePreview";

type Verdict = "keep" | "dup" | "blur";

// The pile, cell by cell (4 x 3). `p` is the sample photo; a look-alike
// repeats its neighbour's photo with a slightly different framing.
const PILE: Array<{ p: number; v: Verdict }> = [
  { p: 2, v: "keep" },
  { p: 2, v: "dup" },
  { p: 5, v: "keep" },
  { p: 6, v: "blur" },
  { p: 1, v: "keep" },
  { p: 9, v: "blur" },
  { p: 7, v: "keep" },
  { p: 7, v: "dup" },
  { p: 3, v: "dup" },
  { p: 8, v: "keep" },
  { p: 4, v: "blur" },
  { p: 0, v: "dup" },
];
// Hand-placed mess: offset in % of the stage, and tilt in degrees.
const JITTER = [
  [-2, 3, -9],
  [3, -2, 7],
  [-1, -3, 4],
  [2, 2, -6],
  [1, -2, 8],
  [-3, 1, -5],
  [2, 3, -8],
  [-2, -1, 10],
  [3, 1, -4],
  [-1, 2, 6],
  [2, -3, -10],
  [-3, 2, 5],
];
const COLS = [14, 38, 62, 86];
const ROWS = [24, 52, 80];

const FINALE = "pujo-collage";
const KEEPERS = PILE.filter((t) => t.v === "keep").map((t) => t.p);
const REJECTED = PILE.length - KEEPERS.length;

const STEPS = [
  { t: "সব সিলেক্ট করো", d: "বাছাবাছির দরকার নেই" },
  { t: "AI ছাঁকবে", d: "ঝাপসা আর একই রকম ছবি বাদ" },
  { t: "মুডবোর্ডে বসবে", d: "তারপর সোজা Instagram" },
];
const STEP_MS = [3000, 3400, 4600];

const photo = (p: number) => (SAMPLE.length ? SAMPLE[p % SAMPLE.length] : "");

export function Sieve() {
  const stage = useRef<HTMLDivElement>(null);
  // Plays by itself only while on screen, and not for people who asked for less motion.
  const seen = useInView(stage, { amount: 0.45 });
  const calm = useReducedMotion();
  const inView = seen && !calm;
  const [step, setStep] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (!inView || hold) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS[step]);
    return () => clearTimeout(id);
  }, [step, inView, hold]);

  useEffect(() => {
    if (!hold) return;
    const id = setTimeout(() => setHold(false), 9000);
    return () => clearTimeout(id);
  }, [hold, step]);

  const choose = (k: number) => {
    setStep(k);
    setHold(true);
  };

  const status =
    step === 0
      ? `${bnNum(PILE.length)}টা ছবি`
      : step === 1
        ? `${bnNum(REJECTED)}টা বাদ, ${bnNum(KEEPERS.length)}টা সেরা`
        : "মুডবোর্ড রেডি";

  return (
    <div className="sieve">
      <div className="sv-steps" role="tablist" aria-label="কীভাবে কাজ করে">
        {STEPS.map((s, k) => (
          <button key={k} role="tab" className="sv-step" aria-selected={step === k} onClick={() => choose(k)}>
            <span className="sv-num">{bnNum(k + 1)}</span>
            <span className="sv-text">
              <b>{s.t}</b>
              <small>{s.d}</small>
            </span>
            {step === k && !hold && inView && (
              <motion.i
                key={`t${step}`}
                className="sv-timer"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: STEP_MS[k] / 1000, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="sv-stage" ref={stage} data-step={step}>
        <motion.span key={status} className="sv-status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          {status}
        </motion.span>

        {PILE.map((t, i) => {
          const [dx, dy, r] = JITTER[i];
          const left = `${COLS[i % 4] + dx}%`;
          const top = `${ROWS[Math.floor(i / 4)] + dy}%`;
          const keep = t.v === "keep";
          const target =
            step === 0
              ? { left, top, rotate: r, scale: 1, opacity: 1 }
              : step === 1
                ? keep
                  ? { left, top, rotate: 0, scale: 1.07, opacity: 1 }
                  : { left, top, rotate: r * 0.6, scale: 0.9, opacity: 0.55 }
                : { left: "50%", top: "50%", rotate: 0, scale: 0.3, opacity: 0 };
          return (
            <motion.div
              key={i}
              className="sv-tile"
              data-v={t.v}
              style={{ left, top, x: "-50%", y: "-50%" }}
              animate={target}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                delay: step === 2 ? (keep ? 0.15 : 0) + (i % 4) * 0.03 : step === 0 ? i * 0.035 : 0,
              }}
            >
              {SAMPLE.length > 0 && (
                <img src={photo(t.p)} alt="" draggable={false} style={t.v === "dup" ? { objectPosition: "30% 40%", scale: 1.15 } : undefined} />
              )}
              {keep ? (
                <motion.span
                  className="sv-keep"
                  animate={step === 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                  transition={{ type: "spring", damping: 13, stiffness: 320, delay: step === 1 ? 0.2 + i * 0.04 : 0 }}
                >
                  <CheckIcon />
                </motion.span>
              ) : (
                <motion.span
                  className="sv-stamp"
                  animate={step === 1 ? { opacity: 1, scale: 1, rotate: -12 } : { opacity: 0, scale: 1.9, rotate: -12 }}
                  transition={{ type: "spring", damping: 12, stiffness: 340, delay: step === 1 ? 0.15 + i * 0.05 : 0 }}
                >
                  {t.v === "dup" ? "একই পোজ" : "ঝাপসা"}
                </motion.span>
              )}
            </motion.div>
          );
        })}

        <motion.div
          className="sv-final"
          initial={false}
          animate={step === 2 ? { opacity: 1, scale: 1, rotate: -2.5 } : { opacity: 0, scale: 0.86, rotate: -7 }}
          transition={{ duration: 0.7, delay: step === 2 ? 0.3 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <TemplatePreview id={FINALE} photos={SAMPLE.length ? KEEPERS.map(photo) : []} show={step === 2} delay={0.55} />
        </motion.div>
      </div>
    </div>
  );
}
