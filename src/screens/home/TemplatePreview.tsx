// A moodboard at card size with sample photos already in its windows, for
// the home page. Same geometry as the studio (slot boxes, tilt and window
// outline), drawn under a small see-through copy of the template art
// (scripts/build-template-previews.mjs).
import { motion } from "motion/react";
import { memo, useMemo } from "react";
import { byZ, slotClipCss, slotRadiusCss } from "../../editor/geometry";
import { templateById } from "../../editor/templates";

const W = 1080;
const H = 1920;
const pct = (v: number, base: number) => `${(v / base) * 100}%`;

export const previewArt = (id: string) => `/templates/small/${id}.webp`;

export const TemplatePreview = memo(function TemplatePreview({
  id,
  photos,
  show = true,
  delay = 0,
  className = "",
}: {
  id: string;
  photos: string[];
  // false hides the photos (they pop in, one window after another, when it turns true)
  show?: boolean;
  delay?: number;
  className?: string;
}) {
  const def = templateById(id);
  // Drawn in stacking order; each window keeps its reading-order photo.
  const slots = useMemo(() => byZ(def.layout(W, H).slots.map((s, order) => ({ ...s, order }))), [def]);

  if (!photos.length) {
    return (
      <div className={`tp ${className}`}>
        <img className="tp-art" src={def.thumbSrc?.story} alt={def.name} loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className={`tp ${className}`}>
      {slots.map((s) => {
        const src = photos[s.order % photos.length];
        return (
          <div
            key={s.id}
            className="tp-slot"
            style={{
              left: pct(s.x, W),
              top: pct(s.y, H),
              width: pct(s.w, W),
              height: pct(s.h, H),
              rotate: s.rotate ? `${s.rotate}deg` : undefined,
              borderRadius: slotRadiusCss(s),
              clipPath: slotClipCss(s),
            }}
          >
            <motion.img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              initial={{ opacity: 0, scale: 1.18 }}
              animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.18 }}
              transition={{ duration: 0.55, delay: show ? delay + s.order * 0.09 : 0, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        );
      })}
      <img className="tp-art" src={previewArt(id)} alt={def.name} loading="lazy" decoding="async" draggable={false} />
    </div>
  );
});
