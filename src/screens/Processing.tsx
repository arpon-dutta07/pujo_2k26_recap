// The photo check ("অগ্নিপরীক্ষা"). Above, the 3D cards fall into the flame;
// here every photo shows up the moment it is checked, with its verdict, and
// a tap on any of them keeps it for sure.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { HeartIcon } from "../components/Icons";
import { PUJO_DAYS } from "../config";
import { bnNum } from "../lib/bn";
import { dayLabel } from "../lib/days";
import type { AnalysisPhase, Photo, PhotoStatus, Progress } from "../lib/types";

// `seq` is the order the photo was checked in; it picks its cell on the wall.
export type LiveThumb = { id: string; seq: number; url: string; status: PhotoStatus; day: Photo["day"] };
export type LiveFeed = { recent: LiveThumb[]; days: Partial<Record<string, number>> };

const LINES: Record<AnalysisPhase, string[]> = {
  reading: ["ছবিগুলো খুলছি…", "Face model নামছে, একটু দাঁড়াও…"],
  looking: [
    "কোনটা কোন দিনের, দেখছি…",
    "একই পোজের দশটা থেকে একটা রাখছি…",
    "ঝাপসাগুলো আগুনে যাচ্ছে…",
    "কার চোখ বন্ধ, খুঁজছি…",
    "কে সবচেয়ে ভালো হেসেছে, দেখছি…",
  ],
  faces: ["মুখগুলো দেখছি…", "গ্রুপ ছবিতে মাথা গুনছি…"],
  choosing: ["প্রতিদিনের সেরাগুলো বাছছি…"],
  done: ["হয়ে গেছে!"],
};

const VERDICT: Partial<Record<PhotoStatus, string>> = {
  ok: "রাখলাম",
  duplicate: "একই পোজ",
  blurry: "ঝাপসা",
};

// Days in Pujo order, then the edges.
const DAY_KEYS = ["before", ...PUJO_DAYS.map((d) => d.key), "after"] as const;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="stat">
      <motion.b key={value} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
        {bnNum(value)}
      </motion.b>
      {label}
    </span>
  );
}

// Cells on the wall: photos fill them in turn and the newest replaces the
// oldest, so nothing has to slide around however fast photos come in.
// One row of ten on wide screens, two rows of five on phones.
const CELLS = 10;

export function Processing({
  progress,
  live,
  pinned,
  onTogglePin,
  onCancel,
}: {
  progress: Progress | null;
  live: LiveFeed;
  pinned: ReadonlySet<string>;
  onTogglePin: (id: string) => void;
  onCancel: () => void;
}) {
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
  const days = DAY_KEYS.filter((k) => live.days[k]);
  const cells: Array<LiveThumb | null> = Array(CELLS).fill(null);
  for (const t of live.recent) if (!cells[t.seq % CELLS]) cells[t.seq % CELLS] = t;
  const nextCell = live.recent.length ? (live.recent[0].seq + 1) % CELLS : 0;

  return (
    <section className="processing" aria-live="polite">
      <motion.div
        className="process-panel"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="process-head">
          <div>
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
          </div>
          <button className="btn btn-ghost btn-small" onClick={onCancel}>
            থামাও
          </button>
        </div>

        <div className="process-bar">
          <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ ease: "easeOut", duration: 0.3 }} />
          </div>
          <span className="process-count">
            {bnNum(progress?.done ?? 0)}/{bnNum(progress?.total ?? 0)}
          </span>
        </div>

        <div className="live-wall">
          {cells.map((t, i) =>
            t ? (
              <motion.button
                key={t.id}
                className="live-thumb"
                data-status={t.status}
                data-pinned={pinned.has(t.id) || undefined}
                aria-pressed={pinned.has(t.id)}
                aria-label={pinned.has(t.id) ? "পছন্দ থেকে সরাও" : "এই ছবিটা রাখো"}
                onClick={() => onTogglePin(t.id)}
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <img src={t.url} alt="" draggable={false} />
                <span className="live-chip">{pinned.has(t.id) ? "থাকবেই" : VERDICT[t.status]}</span>
                <HeartIcon className="live-heart" />
              </motion.button>
            ) : (
              <span key={`empty-${i}`} className="live-thumb live-empty" data-next={i === nextCell || undefined} />
            ),
          )}
        </div>

        <div className="process-foot">
          <p className="live-hint">
            {pinned.size ? `তোমার পছন্দের ${bnNum(pinned.size)}টা থাকবেই` : "যেটা রাখতেই হবে, ট্যাপ করে দাও"}
          </p>
          <div className="stats">
            <Stat value={progress?.duplicates ?? 0} label="একই পোজ" />
            <Stat value={progress?.blurry ?? 0} label="ঝাপসা" />
            <Stat value={progress?.faces ?? 0} label="মুখ" />
          </div>
        </div>

        {days.length > 0 && (
          <div className="day-row">
            {days.map((k) => (
              <motion.span key={k} className="day-chip" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                {dayLabel(k as Photo["day"])}
                <b>{bnNum(live.days[k] ?? 0)}</b>
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
