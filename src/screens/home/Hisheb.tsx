// The Pujo story card, live: the photo count rolls up when it comes into
// view and a tap deals out another (made-up) visitor's Pujo. Every line is
// one the real card can write from the photos (lib/stats.ts).
import { animate, AnimatePresence, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TiltCard } from "../../components/TiltCard";
import { bnNum } from "../../lib/bn";

const SAMPLES = [
  {
    total: 382,
    lines: [
      "ঠাকুরের ছবি ১২০টা, নিজের ২৬২টা। মা সব দেখছেন।",
      "সবচেয়ে বড় গ্রুপ ছবিতে ১১ জন। তার মধ্যে ৪ জনের চোখ বন্ধ।",
      "শেষ ছবি রাত ৩:৪৭-এ। ঘুম? সেটা আবার কী?",
    ],
  },
  {
    total: 517,
    lines: [
      "সবচেয়ে বেশি ছবি অষ্টমীতে: ১৪৬টা।",
      "একই পোজে ২৩টা ছবি। ভালো এসেছে একটাই, সেটা রেখে দিয়েছি।",
      "ছবির লোকেশন বলছে, পুজোয় মোট ৪২ কিমি ঘুরেছ।",
    ],
  },
  {
    total: 244,
    lines: [
      "সবচেয়ে বড় গ্রুপ ছবিতে ৮ জন, আর সবার চোখ খোলা। এটাই পুজোর আসল মিরাকল।",
      "১৮টা ছবি ঝাপসা। ভিড়ে হাত কেঁপেছিল, বুঝি।",
      "রাত ১১:৪০-এও ক্যামেরা চলছিল।",
    ],
  },
];

export function Hisheb() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const [k, setK] = useState(0);
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => `${bnNum(Math.round(v))}টা`);

  useEffect(() => {
    if (!seen) return;
    const run = animate(count, SAMPLES[k].total, { duration: 1.5, ease: [0.22, 1, 0.36, 1] });
    return () => run.stop();
  }, [seen, k, count]);

  return (
    <section className="home-band home-night">
      <div className="home-wrap hisheb">
        <div>
          <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            তোমার পুজোর হিসেব
          </motion.h2>
          <p className="home-sub">কটা ঠাকুর, কটা নিজের, কোন রাতে ঘুমোওনি। story-তে দেওয়ার মতো এক কার্ডে।</p>
          <p className="hisheb-tap">কার্ডে ছোঁও, আরেকজনের হিসেব দেখো</p>
        </div>

        <div ref={ref} className="hisheb-card-wrap">
          <TiltCard max={10}>
            <button className="hisheb-card" onClick={() => setK((n) => (n + 1) % SAMPLES.length)} aria-label="আরেকটা হিসেব দেখাও">
              <span className="hc-title">এবারের পুজোর হিসেব</span>
              <motion.span className="hc-big">{text}</motion.span>
              <span className="hc-sub">ছবি তুলেছ</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={k}
                  className="hc-lines"
                  initial={{ opacity: 0, rotateX: -70 }}
                  animate={{ opacity: 1, rotateX: 0 }}
                  exit={{ opacity: 0, rotateX: 70 }}
                  transition={{ duration: 0.35 }}
                >
                  {SAMPLES[k].lines.map((l, i) => (
                    <motion.span
                      key={l}
                      className="hc-chit"
                      initial={{ opacity: 0, x: -16 }}
                      animate={seen ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.25 + i * 0.15 }}
                    >
                      {l}
                    </motion.span>
                  ))}
                </motion.span>
              </AnimatePresence>
              <span className="hc-dots" aria-hidden="true">
                {SAMPLES.map((_, i) => (
                  <i key={i} data-on={i === k || undefined} />
                ))}
              </span>
            </button>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
