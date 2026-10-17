// A moodboard on the table with stickers scattered round it: drag them
// anywhere, like in the studio. "আবার ছড়াও" throws them back.
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { DragIcon, RestartIcon } from "../../components/Icons";
import { STICKERS, stickerById } from "../../editor/stickers";
import { bnNum } from "../../lib/bn";
import { SAMPLE } from "./photos";
import { TemplatePreview } from "./TemplatePreview";

// Where each sticker starts, in % of the table, its width in px and tilt.
const SCATTER: Array<{ id: string; x: number; y: number; w: number; r: number }> = [
  { id: "dhak", x: 3, y: 6, w: 104, r: -12 },
  { id: "durga_eyes", x: 70, y: 4, w: 112, r: 8 },
  { id: "joba", x: 9, y: 58, w: 78, r: 10 },
  { id: "dhunuchi", x: 82, y: 44, w: 56, r: -8 },
  { id: "shankh", x: 66, y: 72, w: 96, r: -6 },
  { id: "prodip", x: 26, y: 78, w: 70, r: 4 },
  { id: "radio", x: 4, y: 32, w: 86, r: -5 },
  { id: "jhumka", x: 78, y: 24, w: 62, r: 12 },
];

const PAGE = "mayer-anchol";

export function StickerPlay() {
  const table = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [touched, setTouched] = useState(false);
  const picks = SCATTER.map((s) => ({ ...s, def: stickerById(s.id) })).filter((s) => s.def);

  return (
    <section className="home-band home-cream">
      <div className="home-wrap play">
        <div className="play-copy">
          <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            স্টিকার টেনে বসাও
          </motion.h2>
          <p className="home-sub">ঢাক, শাঁখ, জবা, মায়ের চোখ… {bnNum(STICKERS.length)}টা পুজোর স্টিকার। যেখানে খুশি বসাও।</p>
          <button
            className="pill-btn pill-dark"
            onClick={() => {
              setRound((r) => r + 1);
              setTouched(false);
            }}
          >
            <RestartIcon />
            আবার ছড়াও
          </button>
        </div>

        <div className="play-table" ref={table}>
          <div className="play-page">
            <TemplatePreview id={PAGE} photos={SAMPLE.length ? [SAMPLE[5 % SAMPLE.length]] : []} />
          </div>
          {picks.map((s, i) => (
            <motion.img
              key={`${s.id}-${round}`}
              src={s.def!.src}
              alt={s.def!.name}
              className="play-sticker"
              draggable={false}
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.w }}
              initial={{ scale: 0, rotate: s.r - 30 }}
              animate={{ scale: 1, rotate: s.r }}
              transition={{ type: "spring", damping: 14, stiffness: 220, delay: i * 0.05 }}
              drag
              dragConstraints={table}
              dragElastic={0.18}
              dragTransition={{ bounceStiffness: 300, bounceDamping: 18 }}
              whileHover={{ scale: 1.08 }}
              whileDrag={{ scale: 1.18, rotate: s.r + 8, zIndex: 5, filter: "drop-shadow(0 18px 18px rgba(43, 11, 18, 0.35))" }}
              onDragStart={() => setTouched(true)}
            />
          ))}
          <motion.span className="play-hint" animate={{ opacity: touched ? 0 : 1, y: touched ? 8 : 0 }}>
            <DragIcon />
            টেনে দেখো
          </motion.span>
        </div>
      </div>
    </section>
  );
}
