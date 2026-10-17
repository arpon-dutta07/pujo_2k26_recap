import { motion } from "motion/react";
import { useRef } from "react";
import { Headline } from "../components/Headline";
import { CheckIcon, FlameArt, FrameArt, LockIcon, PhotosIcon, SieveArt } from "../components/Icons";
import { TiltCard } from "../components/TiltCard";
import { LIMITS } from "../config";
import { bnNum } from "../lib/bn";

const rise = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const STEPS = [
  {
    n: "১",
    title: "সব ছবি দাও",
    body: `পুজোর ৫০টা হোক বা ${bnNum(300)}টা, গ্যালারি থেকে একবারে সিলেক্ট করো। বাছতে হবে না।`,
    Art: SieveArt,
  },
  {
    n: "২",
    title: "অগ্নিপরীক্ষা",
    body: "একই পোজের ছবি থেকে একটা রাখি, ঝাপসা ছবি বাদ দিই, কার চোখ বন্ধ দেখি, আর ষষ্ঠী থেকে দশমী দিন ধরে সাজাই।",
    Art: FlameArt,
  },
  {
    n: "৩",
    title: "Instagram-রেডি",
    body: "লাল পাড় ফ্রেমে carousel, তোমার পুজোর মজার হিসেব, আর ক্যাপশন। এক ট্যাপে শেয়ার।",
    Art: FrameArt,
  },
];

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
            সব ছবি একবারে দাও। সেরাগুলো বেছে Instagram-রেডি carousel আর তোমার পুজোর হিসেব বানিয়ে দেব, মিনিটখানেকের মধ্যে।
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
              পুজোর ছবি বাছো
            </motion.button>
            <span className="drop-hint">অথবা এখানে টেনে এনে ছেড়ে দাও</span>
          </motion.div>
          <motion.div
            className="privacy-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <LockIcon />
            ছবি তোমার ফোন থেকে কোথাও যায় না। সব কাজ এখানেই হয়।
          </motion.div>
          <motion.div className="scroll-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <span /> কীভাবে কাজ করে
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

      <section className="band band-dark">
        <motion.h2 className="section-title" {...rise}>
          তিন ধাপ, মিনিটখানেক
        </motion.h2>
        <motion.p className="section-sub" {...rise} transition={{ delay: 0.05 }}>
          বাছাই, সাজানো, ক্যাপশন: যে তিনটে কাজের ভয়ে ছবি গ্যালারিতে পড়ে থাকে, সেগুলো আমরা করে দিই।
        </motion.p>
        <div className="steps">
          {STEPS.map(({ n, title, body, Art }, i) => (
            <motion.article
              key={n}
              className="step"
              initial={{ opacity: 0, y: 60, rotateX: 18 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, rotateX: 4, rotateY: i === 0 ? 5 : i === 2 ? -5 : 0 }}
            >
              <Art className="step-art" />
              <div className="step-num">{n}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="split">
          <div>
            <motion.h2 className="section-title" {...rise}>
              তোমার পুজোর হিসেব
            </motion.h2>
            <motion.p className="section-sub" {...rise}>
              ছবিগুলো দেখে একটা story card বানাই। কটা ঠাকুরের ছবি, কটা নিজের, কোন রাতে ঘুমোওনি, সব লেখা থাকবে। story-তে দিলে বন্ধুরাও নিজেরটা বানাতে চাইবে।
            </motion.p>
            <motion.ul className="ticks" {...rise}>
              <li>
                <CheckIcon />
                গ্রুপ ছবিতে কজন ছিল আর কার চোখ বন্ধ, মুখ চেনার AI নিজেই গোনে
              </li>
              <li>
                <CheckIcon />
                ছবির তারিখ দেখে বুঝে যায় কোনটা অষ্টমী, কোনটা নবমী
              </li>
              <li>
                <CheckIcon />
                একই পোজে ২০টা তুললে সেরাটা রেখে বাকিগুলো সরিয়ে দেয়
              </li>
            </motion.ul>
          </div>
          <motion.div
            className="roast-sample"
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard>
              <div className="sample-card">
                <div className="t">এবারের পুজোর হিসেব</div>
                <div className="big">৩৮২টা</div>
                <div style={{ color: "var(--muted)", marginBottom: 10 }}>ছবি তুলেছ</div>
                <div className="chit">ঠাকুরের ছবি ১২০টা, নিজের ২৬২টা। মা সব দেখছেন।</div>
                <div className="chit">সবচেয়ে বড় গ্রুপ ছবিতে ১১ জন। তার মধ্যে ৪ জনের চোখ বন্ধ।</div>
                <div className="chit">শেষ ছবি রাত ৩:৪৭-এ। ঘুম? সেটা আবার কী?</div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      <section className="band band-dark">
        <div className="split">
          <div>
            <motion.h2 className="section-title" {...rise}>
              ছবি তোমার কাছেই থাকে
            </motion.h2>
            <motion.p className="section-sub" {...rise}>
              কোনো server নেই, লগইন নেই, আপলোড নেই। মুখ চেনার AI (Google MediaPipe) একবার তোমার ব্রাউজারে নামে, তারপর ফোনের মধ্যেই চলে। পেজটা বন্ধ করলেই সব মুছে যায়।
            </motion.p>
            <motion.button className="btn btn-primary" onClick={pick} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} {...rise}>
              <PhotosIcon />
              শুরু করো
            </motion.button>
          </div>
          <motion.ul className="ticks" {...rise}>
            <li>
              <LockIcon />
              ছবি ফোনেই থাকে, কোথাও পাঠানো হয় না
            </li>
            <li>
              <CheckIcon />
              {`একবারে ${bnNum(LIMITS.maxPhotos)}টা পর্যন্ত ছবি`}
            </li>
            <li>
              <CheckIcon />
              iPhone আর Android, দুটোতেই চলে
            </li>
          </motion.ul>
        </div>
      </section>

      <footer className="footer">
        <span>পুজোর ঝুলি · শারদীয়া ২০২৬</span>
        <span>মুখ চেনে Google MediaPipe, চলে তোমার ফোনেই</span>
      </footer>
    </>
  );
}
