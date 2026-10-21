// One caption at a time in the export sheet, ready to copy with the page's tag
// at the end. "অন্যটা" shows another.
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { CheckIcon, CopyIcon, ShuffleIcon } from "../components/Icons";
import { SITE } from "../config";
import { CAPTIONS, copyText, fullCaption, HANDLE } from "../lib/captions";

export function CaptionPick({ onToast }: { onToast: (t: string) => void }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * CAPTIONS.length));
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  const c = CAPTIONS[i];

  const next = () => {
    setCopied(false);
    setI((k) => (k + 1 + Math.floor(Math.random() * (CAPTIONS.length - 1))) % CAPTIONS.length);
  };

  const copy = async () => {
    const ok = await copyText(fullCaption(c.text));
    if (!ok) {
      onToast("কপি হল না, লেখাটা চেপে ধরে নিজে কপি করো");
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="xc">
      <div className="xc-head">
        <b>Caption</b>
        <button type="button" className="xc-next" onClick={next}>
          <ShuffleIcon /> অন্যটা
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={i}
          className="xc-body"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <p className="xc-text">{c.text}</p>
          <p className="xc-credit">
            মুডবোর্ড বানিয়েছি <b>{HANDLE}</b> এর সাইটে
            <br />
            <span>{SITE.hashtags}</span>
          </p>
        </motion.div>
      </AnimatePresence>
      <button type="button" className="btn btn-ghost xc-copy" data-done={copied || undefined} onClick={copy}>
        {copied ? (
          <>
            <CheckIcon /> কপি হল, এবার paste করো
          </>
        ) : (
          <>
            <CopyIcon /> Caption copy করো
          </>
        )}
      </button>
      <p className="xc-tip">
        Story-তে দিলে caption থাকে না, Mention sticker-এ <b>{SITE.instagram}</b> লিখে দিও।
      </p>
    </div>
  );
}
