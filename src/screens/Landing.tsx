import { motion } from "motion/react";
import { Fragment, useRef } from "react";
import { Headline } from "../components/Headline";
import { LockIcon, PhotosIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import heroPhotos from "../three/hero.generated.json";
import type { Photo } from "../lib/types";
import { Gallery } from "./home/Gallery";
import { PrivacyCta } from "./home/PrivacyCta";
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

export function Landing({
  photos,
  adding,
  onFiles,
  onRemovePhoto,
  onStart,
}: {
  photos: Photo[];
  adding: number;
  onFiles: (files: File[]) => void;
  onRemovePhoto: (id: string) => void;
  onStart: (templateId: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pick = () => input.current?.click();
  const toGallery = () => document.getElementById("moodboards")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="chip">শারদীয়া ২০২৬</span>
          </motion.div>
          <Headline
            lines={[
              { text: "পুজোর ছবি দিয়ে" },
              { text: "মুডবোর্ড বানাও", accent: true },
            ]}
          />
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            ছবি দাও, পছন্দের ফ্রেম বাছো, স্টিকার লাগাও। তারপর সোজা <span style={{ whiteSpace: "nowrap" }}>story-তে।</span>
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
              ছবি দাও
            </motion.button>
            <motion.button className="btn btn-ghost" onClick={toGallery} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              আগে মুডবোর্ড দেখো
            </motion.button>
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
            <span /> {photos.length ? `${bnNum(photos.length)}টা ছবি নেওয়া হয়েছে, নিচে মুডবোর্ড বাছো` : "প্রদীপ ঘিরে ঘুরছে এবারের পুজোর ছবি"}
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
            if (files.length) {
              toGallery();
              onFiles(files);
            }
          }}
        />
      </section>

      <div className="home">
        <Gallery photos={photos} adding={adding} onPick={pick} onRemove={onRemovePhoto} onStart={onStart} />
        <StickerPlay />
        <PrivacyCta onPick={pick} />
      </div>

      <footer className="footer">
        <span>পুজোর ঝুলি · শারদীয়া ২০২৬</span>
        <span>সব কাজ তোমার ফোনেই হয়</span>
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
