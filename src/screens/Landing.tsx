import { motion } from "motion/react";
import { Fragment, useRef } from "react";
import { Headline } from "../components/Headline";
import { LockIcon, PhotosIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import heroPhotos from "../three/hero.generated.json";
import { Garland } from "./home/Garland";
import { Hisheb } from "./home/Hisheb";
import { Moodboards } from "./home/Moodboards";
import { PrivacyCta } from "./home/PrivacyCta";
import { Sieve } from "./home/Sieve";
import { StickerPlay } from "./home/StickerPlay";
import "./home/home.css";

// Who took the Pujo photos used across the page (npm run hero), one entry per
// photographer with links to each of their photos, and the licences used.
type Credit = { author: string; license: string; licenseUrl: string; page: string };
const HERO_CREDITS = (heroPhotos as { credits: Credit[] }).credits;
const PHOTOGRAPHERS = [...new Set(HERO_CREDITS.map((c) => c.author))].map((author) => ({
  author,
  pages: HERO_CREDITS.filter((c) => c.author === author).map((c) => c.page),
}));
const LICENCES = [...new Map(HERO_CREDITS.map((c) => [c.license, c.licenseUrl])).entries()];
const FROM_COMMONS = HERO_CREDITS.some((c) => c.page.includes("commons.wikimedia.org"));

export function Landing({ onFiles }: { onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const pick = () => input.current?.click();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="chip">শারদীয়া ২০২৬</span>
          </motion.div>
          <Headline
            lines={[
              { text: `পুজোর ${bnNum(300)}টা ছবি` },
              { text: "গ্যালারিতে পড়ে আছে?", accent: true },
            ]}
          />
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            সব একসাথে দিয়ে দাও। ভালোগুলো বেছে মুডবোর্ডে সাজিয়ে দেব, সঙ্গে একটা পুজোর হিসেব।
          </motion.p>
          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <motion.button
              className="btn btn-primary"
              onClick={pick}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <PhotosIcon />
              ছবি সিলেক্ট করো
            </motion.button>
            <span className="drop-hint">বা এখানে drag করে ছেড়ে দাও</span>
          </motion.div>
          <motion.div
            className="privacy-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <LockIcon />
            ছবি তোমার ফোনেই থাকে, কোথাও upload হয় না।
          </motion.div>
          <motion.div className="scroll-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <span /> নিচে দেখো, কীভাবে হয়
          </motion.div>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
      </section>

      <div className="home">
        <section className="home-band home-paper home-first">
          <Garland />
          <div className="home-wrap">
            <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              ৩০০ থেকে সেরা ১২
            </motion.h2>
            <p className="home-sub">ঝাপসা, একই পোজের দশটা, চোখ বন্ধ, সব বাদ।</p>
            <Sieve />
          </div>
        </section>
        <Moodboards />
        <StickerPlay />
        <Hisheb />
        <PrivacyCta onPick={pick} />
      </div>

      <footer className="footer">
        <span>পুজোর ঝুলি · শারদীয়া ২০২৬</span>
        <span>Face detection: Google MediaPipe, চলে ফোনেই</span>
        {PHOTOGRAPHERS.length > 0 && (
          <p className="footer-credits">
            {"এই পাতার পুজো ২০২৬-এর ছবি: "}
            {PHOTOGRAPHERS.map((p, i) => (
              <Fragment key={p.author}>
                {i > 0 && ", "}
                <a href={p.pages[0]} target="_blank" rel="noreferrer">
                  {p.author}
                </a>
                {p.pages.length > 1 && (
                  <>
                    {" ("}
                    {p.pages.map((page, k) => (
                      <Fragment key={page}>
                        {k > 0 && ", "}
                        <a href={page} target="_blank" rel="noreferrer">
                          {bnNum(k + 1)}
                        </a>
                      </Fragment>
                    ))}
                    {")"}
                  </>
                )}
              </Fragment>
            ))}
            {FROM_COMMONS && " · Wikimedia Commons"}
            {" · "}
            {LICENCES.map(([name, url], i) => (
              <Fragment key={name}>
                {i > 0 && " / "}
                <a href={url} target="_blank" rel="noreferrer">
                  {name}
                </a>
              </Fragment>
            ))}
            {" · মাপে কাটা"}
          </p>
        )}
      </footer>
    </>
  );
}
