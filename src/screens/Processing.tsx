import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { bnNum } from "../lib/bn";
import type { AnalysisPhase, Progress } from "../lib/types";

const LINES: Record<AnalysisPhase, string[]> = {
  reading: ["ছবিগুলো ঝুলিতে ভরছি…", "মুখ চেনার মডেল নামছে…"],
  looking: [
    "তারিখ দেখে ষষ্ঠী-সপ্তমী ভাগ করছি…",
    "একই পোজের দশটা ছবি থেকে একটা রাখছি…",
    "ঝাপসা ছবিগুলো আগুনে দিচ্ছি…",
    "কার চোখ বন্ধ, দেখছি…",
    "কে সবচেয়ে সুন্দর হেসেছে, মাপছি…",
  ],
  faces: ["মুখ চেনার মডেল কাজ করছে…", "গ্রুপ ছবিতে গুনছি কজন ছিল…"],
  choosing: ["প্রতিদিনের সেরাগুলো বাছছি…"],
  done: ["হয়ে গেছে!"],
};

export function Processing({ progress, onCancel }: { progress: Progress | null; onCancel: () => void }) {
  const phase = progress?.phase ?? "reading";
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2300);
    return () => clearInterval(id);
  }, []);
  const lines = LINES[phase];
  const line = lines[tick % lines.length];
  const pct = progress && progress.total ? (progress.done / progress.total) * 100 : 0;
  const title = phase === "faces" ? "মুখ দেখা চলছে" : phase === "done" || phase === "choosing" ? "বাছাই চলছে" : "অগ্নিপরীক্ষা চলছে";

  return (
    <section className="processing" aria-live="polite">
      <motion.div
        className="process-panel"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2>{title}</h2>
        <div className="fun-line">
          <AnimatePresence mode="wait">
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {line}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ ease: "easeOut", duration: 0.3 }} />
        </div>
        <div className="counters">
          <div className="counter">
            <b>
              {bnNum(progress?.done ?? 0)}/{bnNum(progress?.total ?? 0)}
            </b>
            <span>{phase === "faces" ? "মুখ দেখা" : "ছবি দেখা"}</span>
          </div>
          <div className="counter">
            <b>{bnNum(progress?.duplicates ?? 0)}</b>
            <span>একই পোজ</span>
          </div>
          <div className="counter">
            <b>{bnNum(progress?.blurry ?? 0)}</b>
            <span>ঝাপসা</span>
          </div>
          <div className="counter">
            <b>{bnNum(progress?.faces ?? 0)}</b>
            <span>মুখ পাওয়া</span>
          </div>
        </div>
        <div className="process-foot">
          <span className="privacy-line" style={{ fontSize: 14 }}>
            সব কাজ তোমার ফোনেই হচ্ছে
          </span>
          <button className="btn btn-ghost btn-small" onClick={onCancel}>
            থামাও
          </button>
        </div>
      </motion.div>
    </section>
  );
}
