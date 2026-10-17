import { motion } from "motion/react";
import { useRef } from "react";
import { Headline } from "../components/Headline";
import { CheckIcon, FlameArt, FrameArt, LockIcon, PhotosIcon, SieveArt } from "../components/Icons";
import { TiltCard } from "../components/TiltCard";
import { LIMITS } from "../config";
import { STICKERS } from "../editor/stickers";
import { templatesFor } from "../editor/templates";
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
    title: "মুডবোর্ডে সাজাও",
    body: "AI-র বাছা ছবি পুজোর মুডবোর্ডে নিজে থেকে বসে যায়। পছন্দ না হলে নিজের ছবি দাও, স্টিকার লাগাও, তারপর এক ট্যাপে শেয়ার।",
    Art: FrameArt,
  },
];

// The live moodboards, with how many photos each one holds.
const MOODBOARDS = templatesFor("story").map((t) => ({
  id: t.id,
  name: t.name,
  thumb: t.thumbSrc?.story ?? "",
  photos: t.layout(1080, 1920).slots.length,
}));

// Tilts for the sticker wall, so it looks stuck on by hand.
const TILTS = [-8, 6, -3, 9, 4, -7, 7, -4];

// Small lotus between a pair of gold hairlines, on top of every section.
function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
        <path d="M16 6c3.2 4 4.4 7.2 4.4 10.2a4.4 4.4 0 0 1-8.8 0C11.6 13.2 12.8 10 16 6z" />
        <path d="M16 26c-5.2 0-9.2-3-10.4-7.4 3.4-.2 6.4 1.2 8.6 3.6M16 26c5.2 0 9.2-3 10.4-7.4-3.4-.2-6.4 1.2-8.6 3.6" />
      </svg>
    </div>
  );
}

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
            সব ছবি একবারে দাও। সেরাগুলো বেছে পুজোর মুডবোর্ডে সাজিয়ে দেব, সঙ্গে তোমার পুজোর হিসেব। মিনিটখানেকের মধ্যে।
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
        <Ornament />
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
        <Ornament />
        <div className="section-head">
          <motion.h2 className="section-title" {...rise}>
            পুজোর মুডবোর্ড
          </motion.h2>
          <motion.p className="section-sub" {...rise}>
            বাংলার পুজো মাথায় রেখে বানানো টেমপ্লেট: ঠাকুরের মুখ, লাল পাড়, ঢাক, শিউলি, পুরনো কলকাতা। ফাঁকা ফ্রেমে তোমার ছবি ঠিক মাপে বসে যায়, হেলানো পোলারয়েডেও।
          </motion.p>
        </div>
        {/* One trigger for the whole strip: the cards wipe up out of the black one after another. */}
        <motion.div className="mood-strip" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
          {MOODBOARDS.map((t, i) => (
            <motion.figure
              key={t.id}
              className="mood-card"
              custom={i}
              variants={{
                hidden: { clipPath: "inset(100% 0% 0% 0%)", y: 24 },
                show: (k: number) => ({
                  clipPath: "inset(0% 0% 0% 0%)",
                  y: 0,
                  transition: { duration: 0.8, delay: Math.min(k, 5) * 0.08, ease: [0.22, 1, 0.36, 1] },
                }),
              }}
            >
              <img src={t.thumb} alt={t.name} loading="lazy" decoding="async" />
              <figcaption>
                <b>{t.name}</b>
                <span>{bnNum(t.photos)}টা ছবি</span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </section>

      <section className="band band-dark">
        <Ornament />
        <div className="split">
          <div>
            <motion.h2 className="section-title" {...rise}>
              স্টিকারের ঝুলি
            </motion.h2>
            <motion.p className="section-sub" {...rise}>
              ঢাক, শাঁখ, জবা, ধুনুচি, মায়ের চোখ, মহালয়ার রেডিও। টেনে এনে পাতার যেখানে খুশি বসাও, ঘোরাও, বড়-ছোট করো। সঙ্গে আছে বাংলা লেখা-স্টিকার।
            </motion.p>
          </div>
          <motion.div className="sticker-wall" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            {STICKERS.map((st, i) => (
              <motion.img
                key={st.id}
                src={st.src}
                alt={st.name}
                decoding="async"
                style={{ rotate: TILTS[i % TILTS.length] }}
                custom={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.6, y: 24 },
                  show: (k: number) => ({
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { type: "spring", damping: 15, stiffness: 170, delay: k * 0.05 },
                  }),
                }}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="band">
        <Ornament />
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
        <Ornament />
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
