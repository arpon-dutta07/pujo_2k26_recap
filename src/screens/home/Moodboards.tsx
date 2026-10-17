// Every live moodboard, already holding real Pujo photos, in a strip you can
// swipe, drag with the mouse or step with the arrows. "ছবি বদলাও" moves
// the photos round so each board shows new ones.
import { motion, useInView } from "motion/react";
import { useRef, useState, type PointerEvent } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ShuffleIcon } from "../../components/Icons";
import { templatesFor } from "../../editor/templates";
import { bnNum } from "../../lib/bn";
import { SAMPLE, turn } from "./photos";
import { TemplatePreview } from "./TemplatePreview";

const BOARDS = templatesFor("story").map((t) => ({ id: t.id, name: t.name, photos: t.layout(1080, 1920).slots.length }));

function Board({ id, name, count, photos, i }: { id: string; name: string; count: number; photos: string[]; i: number }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.figure
      ref={ref}
      className="mb-card"
      whileHover={{ y: -10, rotate: i % 2 ? 1.5 : -1.5 }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
    >
      <TemplatePreview id={id} photos={photos} show={seen} />
      <figcaption>
        <b>{name}</b>
        <span>{bnNum(count)}টা ছবি</span>
      </figcaption>
    </motion.figure>
  );
}

// Mouse users drag the strip sideways; touch and trackpads scroll it natively.
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  return {
    ref,
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !ref.current) return;
      drag.current = { x: e.clientX, left: ref.current.scrollLeft };
      ref.current.setPointerCapture(e.pointerId);
      ref.current.dataset.dragging = "";
    },
    onPointerMove: (e: PointerEvent) => {
      if (!drag.current || !ref.current) return;
      ref.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    },
    onPointerUp: () => {
      drag.current = null;
      if (ref.current) delete ref.current.dataset.dragging;
    },
  };
}

export function Moodboards() {
  const [round, setRound] = useState(0);
  const { ref, ...dragHandlers } = useDragScroll();
  const step = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.75, behavior: "smooth" });

  return (
    <section className="home-band home-red" id="moodboards">
      <div className="home-wrap mb-head">
        <div>
          <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            {bnNum(BOARDS.length)}টা পুজোর মুডবোর্ড
          </motion.h2>
          <p className="home-sub">ফাঁকা ফ্রেমে তোমার ছবি ঠিক মাপে বসে যায়।</p>
        </div>
        <div className="mb-tools">
          {SAMPLE.length > 0 && (
            <motion.button className="pill-btn" onClick={() => setRound((r) => r + 1)} whileTap={{ scale: 0.94 }}>
              <motion.span key={round} initial={{ rotate: -180 }} animate={{ rotate: 0 }} style={{ display: "inline-flex" }}>
                <ShuffleIcon />
              </motion.span>
              ছবি বদলাও
            </motion.button>
          )}
          <button className="round-btn" onClick={() => step(-1)} aria-label="আগের মুডবোর্ড">
            <ArrowLeftIcon />
          </button>
          <button className="round-btn" onClick={() => step(1)} aria-label="পরের মুডবোর্ড">
            <ArrowRightIcon />
          </button>
        </div>
      </div>
      <div className="mb-row" ref={ref} {...dragHandlers}>
        {BOARDS.map((b, i) => (
          <Board key={b.id} id={b.id} name={b.name} count={b.photos} photos={turn(SAMPLE, i * 3 + round * 4)} i={i} />
        ))}
      </div>
    </section>
  );
}
