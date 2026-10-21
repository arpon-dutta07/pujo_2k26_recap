// Captions to paste on Instagram, as paper notes on a dark band. A tap copies
// one, with the line that tags the page and the hashtags already at the end.
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { CopyIcon, ShuffleIcon } from "../../components/Icons";
import { SITE } from "../../config";
import { bnNum } from "../../lib/bn";
import { CAPTIONS, copyText, fullCaption, HANDLE, MOODS, PROFILE_URL, type Caption, type Mood } from "../../lib/captions";

const FIRST = 8;

function Note({ c, i, copied, lucky, onCopy }: { c: Caption; i: number; copied: boolean; lucky: boolean; onCopy: (c: Caption) => void }) {
  const tilt = (((i * 37) % 7) - 3) * 0.55;
  return (
    <motion.button
      layout
      type="button"
      className="cap-note"
      data-lucky={lucky || undefined}
      onClick={() => onCopy(c)}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0, rotate: lucky ? [tilt, tilt - 5, tilt + 5, tilt - 2, tilt] : tilt }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{ y: -6, rotate: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", damping: 20, stiffness: 220 }}
      aria-label={`${c.text} — কপি করো`}
    >
      <span className="cap-text">{c.text}</span>
      <span className="cap-credit">
        মুডবোর্ড বানিয়েছি <b>{HANDLE}</b> এর সাইটে
      </span>
      <span className="cap-tags">{SITE.hashtags}</span>
      <span className="cap-copy">
        <CopyIcon /> Copy
      </span>
      <AnimatePresence>
        {copied && (
          <motion.span
            className="cap-stamp"
            aria-hidden
            initial={{ opacity: 0, scale: 2.4, rotate: -40 }}
            animate={{ opacity: 1, scale: 1, rotate: -14 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 13, stiffness: 320 }}
          >
            কপি হল
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function CaptionBoard() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [all, setAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [lucky, setLucky] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const timer = useRef(0);
  const grid = useRef<HTMLDivElement>(null);

  const list = CAPTIONS.filter((c) => !mood || c.mood === mood);
  const shown = all ? list : list.slice(0, FIRST);

  const copy = async (c: Caption) => {
    const ok = await copyText(fullCaption(c.text));
    window.clearTimeout(timer.current);
    if (!ok) {
      setStatus("কপি হল না, লেখাটা চেপে ধরে নিজে কপি করো");
      return;
    }
    setCopied(c.text);
    setStatus("কপি হল। Instagram-এ paste করো।");
    navigator.vibrate?.(15);
    timer.current = window.setTimeout(() => setCopied(null), 2200);
  };

  // Copies a random one from what is showing, and makes it wiggle.
  const surprise = () => {
    const pool = list.filter((c) => c.text !== lucky);
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!c) return;
    if (!shown.includes(c)) setAll(true);
    setLucky(c.text);
    void copy(c);
    requestAnimationFrame(() =>
      grid.current?.querySelector('[data-lucky="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  return (
    <section className="home-band home-night cap-band" id="captions">
      <div className="home-wrap">
        <div className="cap-head">
          <div>
            <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              ক্যাপশনও রেডি
            </motion.h2>
            <p className="home-sub">
              পছন্দেরটায় ট্যাপ করো, কপি হয়ে যাবে। Instagram-এ paste করলে শেষে আমাদের পেজ ট্যাগ হয়ে যাবে, ওটা রেখে দিলে খুশি হব।
            </p>
          </div>
          <a className="cap-handle" href={PROFILE_URL} target="_blank" rel="noopener noreferrer">
            <span>Instagram</span>
            <b>{HANDLE}</b>
          </a>
        </div>

        <div className="gl-bar cap-bar">
          <div className="gl-filters" role="tablist" aria-label="কেমন ক্যাপশন">
            <button
              role="tab"
              className="gl-chip"
              aria-selected={mood === null}
              onClick={() => {
                setMood(null);
                setAll(false);
              }}
            >
              সব <small>{bnNum(CAPTIONS.length)}</small>
            </button>
            {MOODS.map(([m, label]) => (
              <button
                key={m}
                role="tab"
                className="gl-chip"
                aria-selected={mood === m}
                onClick={() => {
                  setMood(m);
                  setAll(false);
                }}
              >
                {label} <small>{bnNum(CAPTIONS.filter((c) => c.mood === m).length)}</small>
              </button>
            ))}
          </div>
          <button className="pill-btn" onClick={surprise}>
            <ShuffleIcon />
            যা হোক একটা কপি করো
          </button>
        </div>

        <motion.div className="cap-grid" ref={grid} layout>
          <AnimatePresence mode="popLayout">
            {shown.map((c, i) => (
              <Note key={c.text} c={c} i={i} copied={copied === c.text} lucky={lucky === c.text} onCopy={copy} />
            ))}
          </AnimatePresence>
        </motion.div>

        {!all && list.length > FIRST && (
          <div className="cap-more">
            <button className="pill-btn" onClick={() => setAll(true)}>
              আরও {bnNum(list.length - FIRST)}টা দেখাও
            </button>
          </div>
        )}

        <p className="cap-note-story">
          Story-তে দিলে caption থাকে না। তখন Mention sticker-এ <b>{SITE.instagram}</b> লিখে দিও।
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </section>
  );
}
