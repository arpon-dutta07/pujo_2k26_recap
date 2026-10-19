// The heart of the site: every moodboard, with the visitor's own photos
// already sitting in its frames once they add some (sample Pujo photos until
// then). Boards that take exactly as many photos as they gave come first.
// A tap opens the board in the studio as a new page of the ঝুলি.
import { AnimatePresence, motion, useInView } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { CloseIcon, PhotosIcon, PlusIcon, ShuffleIcon } from "../../components/Icons";
import { templatesFor } from "../../editor/templates";
import { bnNum } from "../../lib/bn";
import type { Photo } from "../../lib/types";
import { Garland } from "./Garland";
import { SAMPLE, turn } from "./photos";
import { TemplatePreview } from "./TemplatePreview";

const BOARDS = templatesFor("story").map((t) => ({ id: t.id, name: t.name, photos: t.layout(1080, 1920).slots.length }));
const FILTERS = [1, 2, 3, 4, 5].filter((n) => BOARDS.some((b) => (n === 5 ? b.photos >= 5 : b.photos === n)));

type Board = (typeof BOARDS)[number];

function Card({ board, photos, mine, fits, onStart }: { board: Board; photos: string[]; mine: boolean; fits: boolean; onStart: (id: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.button
      ref={ref}
      layout
      className="gl-card"
      onClick={() => onStart(board.id)}
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -10 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", damping: 22, stiffness: 240 }}
      aria-label={`${board.name}, ${bnNum(board.photos)}টা ছবি। এটা খোলো`}
    >
      <span className="gl-frame">
        <TemplatePreview id={board.id} photos={photos} show={seen} repeat={!mine} />
        {fits && <span className="gl-fit">তোমার ছবির মাপে</span>}
        <span className="gl-open">এটা বানাও</span>
      </span>
      <span className="gl-meta">
        <b>{board.name}</b>
        <span>{bnNum(board.photos)}টা ছবি</span>
      </span>
    </motion.button>
  );
}

function Tray({ photos, adding, onPick, onRemove }: { photos: Photo[]; adding: number; onPick: () => void; onRemove: (id: string) => void }) {
  if (!photos.length && !adding) {
    return (
      <motion.button className="tray-empty" onClick={onPick} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
        <PhotosIcon />
        <b>ছবি দাও</b>
        <span>গ্যালারি থেকে যতগুলো খুশি। বা এখানে drag করে ছেড়ে দাও।</span>
      </motion.button>
    );
  }
  return (
    <div className="tray-full">
      <div className="tray-thumbs">
        <AnimatePresence initial={false}>
          {photos.map((p) => (
            <motion.span
              key={p.id}
              className="tray-thumb"
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <img src={p.thumbUrl} alt="" draggable={false} />
              <button className="tray-x" onClick={() => onRemove(p.id)} aria-label="ছবিটা সরাও">
                <CloseIcon />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {Array.from({ length: adding }, (_, i) => (
          <motion.span
            key={`l${i}`}
            className="tray-thumb tray-loading"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        ))}
      </div>
      <button className="tray-add" onClick={onPick}>
        <PlusIcon />
        আরও ছবি
      </button>
    </div>
  );
}

export function Gallery({
  photos,
  adding,
  onPick,
  onRemove,
  onStart,
}: {
  photos: Photo[];
  adding: number;
  onPick: () => void;
  onRemove: (id: string) => void;
  onStart: (id: string) => void;
}) {
  const [filter, setFilter] = useState<number | null>(null);
  const mine = photos.length > 0;
  const pool = mine ? photos.map((p) => p.thumbUrl) : SAMPLE;
  const n = photos.length;

  // Exact fits first, then the nearest photo counts.
  const shown = useMemo(() => {
    const list = BOARDS.filter((b) => filter === null || (filter === 5 ? b.photos >= 5 : b.photos === filter));
    if (!mine) return list;
    return [...list].sort((a, b) => Math.abs(a.photos - n) - Math.abs(b.photos - n));
  }, [filter, mine, n]);

  const surprise = () => {
    const fits = BOARDS.filter((b) => !mine || b.photos <= Math.max(1, n));
    const list = fits.length ? fits : BOARDS;
    onStart(list[Math.floor(Math.random() * list.length)].id);
  };

  return (
    <section className="home-band home-paper home-first" id="moodboards">
      <Garland />
      <div className="home-wrap">
        <div className="gl-head">
          <div>
            <motion.h2 className="home-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              মুডবোর্ড বাছো
            </motion.h2>
            <p className="home-sub">
              {mine
                ? `তোমার ${bnNum(n)}টা ছবি সব মুডবোর্ডে বসিয়ে দেখাচ্ছি। যেটা ভালো লাগে, ট্যাপ করো।`
                : "ছবি দিলে প্রতিটা মুডবোর্ডে তোমার ছবিই দেখাবে। যেটা ভালো লাগে, ট্যাপ করো।"}
            </p>
          </div>
        </div>

        <Tray photos={photos} adding={adding} onPick={onPick} onRemove={onRemove} />

        <div className="gl-bar">
          <div className="gl-filters" role="tablist" aria-label="কটা ছবির মুডবোর্ড">
            <button role="tab" className="gl-chip" aria-selected={filter === null} onClick={() => setFilter(null)}>
              সব <small>{bnNum(BOARDS.length)}</small>
            </button>
            {FILTERS.map((k) => (
              <button key={k} role="tab" className="gl-chip" aria-selected={filter === k} onClick={() => setFilter(k)}>
                {k === 5 ? "৫+ ছবি" : `${bnNum(k)}টা ছবি`}
                <small>{bnNum(BOARDS.filter((b) => (k === 5 ? b.photos >= 5 : b.photos === k)).length)}</small>
              </button>
            ))}
          </div>
          <button className="pill-btn pill-dark" onClick={surprise}>
            <ShuffleIcon />
            যা হোক একটা
          </button>
        </div>

        <motion.div className="gl-grid" layout>
          <AnimatePresence mode="popLayout">
            {shown.map((b, i) => (
              <Card key={b.id} board={b} photos={mine ? pool : turn(pool, i * 3)} mine={mine} fits={mine && b.photos === n} onStart={onStart} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
