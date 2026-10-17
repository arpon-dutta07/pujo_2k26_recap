// Last word before the footer: where the photos go (nowhere), and the button.
import { motion } from "motion/react";
import { CloudOffIcon, PhotosIcon, ServerOffIcon, UserOffIcon } from "../../components/Icons";
import { LIMITS } from "../../config";
import { bnNum } from "../../lib/bn";

const POINTS = [
  { Icon: CloudOffIcon, t: "No upload", d: "ছবি ফোন থেকে বেরোয় না" },
  { Icon: UserOffIcon, t: "No login", d: "নাম-নম্বর কিছু চাই না" },
  { Icon: ServerOffIcon, t: "No app", d: "ব্রাউজারেই চলে, কিছু install নয়" },
];

export function PrivacyCta({ onPick }: { onPick: () => void }) {
  return (
    <section className="home-band home-paper">
      <div className="home-wrap promise">
        <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          ছবি তোমার ফোনেই থাকে
        </motion.h2>
        <motion.ul className="promise-list" initial="hide" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
          {POINTS.map(({ Icon, t, d }, i) => (
            <motion.li
              key={t}
              variants={{ hide: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6 } } }}
              whileHover={{ y: -6 }}
            >
              <span className="promise-icon">
                <Icon />
              </span>
              <b>{t}</b>
              <small>{d}</small>
            </motion.li>
          ))}
        </motion.ul>
        <motion.button className="btn btn-primary btn-big" onClick={onPick} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
          <PhotosIcon />
          ছবি সিলেক্ট করো
        </motion.button>
        <p className="promise-note">একবারে {bnNum(LIMITS.maxPhotos)}টা পর্যন্ত ছবি · iPhone আর Android</p>
      </div>
    </section>
  );
}
