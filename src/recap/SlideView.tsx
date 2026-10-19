// One recap slide on the page: the same layout as paint.ts, with every
// element making an entrance. `u` is CSS pixels per slide unit.
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type TargetAndTransition, type Transition } from "motion/react";
import { memo, useEffect, useLayoutEffect, useRef } from "react";
import { stickerById } from "../editor/stickers";
import { usePhotoSrc } from "../editor/photos";
import { bnNum } from "../lib/bn";
import { chipLayout, countText, cropOf, faceRings, familyOf, lines, polaroidParts } from "./measure";
import { paintMotif, paintPattern } from "./paint";
import { SLIDE_H, SLIDE_W, type BarsEl, type CountEl, type El, type PhotoEl, type RouteEl, type Slide, type TextEl } from "./types";

const EASE = [0.22, 1, 0.36, 1] as const;
const px = (v: number, base: number) => `${(v / base) * 100}%`;

type Move = { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition };

// The entrance for one element. `still` shows the end state at once.
function enter(el: El, u: number, still: boolean): Move {
  const r = el.rotate ?? 0;
  const delay = el.at ?? 0;
  const done = { opacity: 1, x: 0, y: 0, scale: 1, rotate: r };
  if (still) return { initial: done, animate: done, transition: { duration: 0 } };
  switch (el.enter ?? "rise") {
    case "pop":
      return { initial: { opacity: 0, scale: 0.4, rotate: r - 12 }, animate: done, transition: { type: "spring", damping: 12, stiffness: 170, delay } };
    case "drop":
      return { initial: { opacity: 0, y: -340 * u, rotate: r + 22 }, animate: done, transition: { type: "spring", damping: 15, stiffness: 110, delay } };
    case "stamp":
      return { initial: { opacity: 0, scale: 2.4, rotate: r }, animate: done, transition: { type: "spring", damping: 14, stiffness: 420, delay } };
    case "slide":
      return { initial: { opacity: 0, x: (el.x < SLIDE_W / 2 ? -420 : 420) * u, rotate: r }, animate: done, transition: { duration: 0.8, ease: EASE, delay } };
    case "fade":
      return { initial: { opacity: 0, rotate: r }, animate: done, transition: { duration: 0.8, delay } };
    case "none":
      return { initial: done, animate: done, transition: { duration: 0 } };
    default:
      return { initial: { opacity: 0, y: 60 * u, rotate: r }, animate: done, transition: { duration: 0.75, ease: EASE, delay } };
  }
}

function TextView({ el, u, still, text }: { el: TextEl | CountEl; u: number; still: boolean; text?: string }) {
  const weight = el.weight ?? 400;
  const ls = lines(text ?? (el as TextEl).text, el.font, el.size, weight, el.w);
  const L = el.size * (el.lh ?? 1.25);
  const words = el.enter === "words" && !still;
  const m = enter(words ? { ...el, enter: "none" } : el, u, still);
  let n = 0;
  return (
    <motion.div
      className="rc-text"
      style={{
        left: px(el.x, SLIDE_W),
        top: px(el.y, SLIDE_H),
        width: px(el.w, SLIDE_W),
        fontFamily: familyOf(el.font),
        fontWeight: weight,
        fontSize: el.size * u,
        lineHeight: `${L * u}px`,
        color: el.color,
        textAlign: el.align ?? "center",
      }}
      {...m}
    >
      {ls.map((l, i) => (
        <div key={i} className="rc-line">
          {words
            ? l.split(" ").map((w, j) => (
                <motion.span
                  key={j}
                  className="rc-word"
                  initial={{ opacity: 0, y: 24 * u }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: (el.at ?? 0) + n++ * 0.07 }}
                >
                  {w}
                  {j < l.split(" ").length - 1 ? " " : ""}
                </motion.span>
              ))
            : l}
        </div>
      ))}
    </motion.div>
  );
}

function CountView({ el, u, still }: { el: CountEl; u: number; still: boolean }) {
  const v = useMotionValue(still ? el.value : 0);
  const shown = useTransform(v, (x) => countText(el, x));
  useEffect(() => {
    if (still) return v.set(el.value);
    const run = animate(v, el.value, { duration: 1.6, ease: EASE, delay: (el.at ?? 0) + 0.15 });
    return () => run.stop();
  }, [el.value, el.at, still, v]);
  // Laid out on the final number so the box never jumps while it rolls.
  const final = countText(el, el.value);
  const L = el.size * (el.lh ?? 1.25);
  const m = enter(el, u, still);
  return (
    <motion.div
      className="rc-text"
      style={{
        left: px(el.x, SLIDE_W),
        top: px(el.y, SLIDE_H),
        width: px(el.w, SLIDE_W),
        fontFamily: familyOf(el.font),
        fontWeight: el.weight ?? 400,
        fontSize: el.size * u,
        lineHeight: `${L * u}px`,
        color: el.color,
        textAlign: el.align ?? "center",
      }}
      aria-label={final}
      {...m}
    >
      <motion.div className="rc-line">{shown}</motion.div>
    </motion.div>
  );
}

function PhotoView({ el, u, still }: { el: PhotoEl; u: number; still: boolean }) {
  const src = usePhotoSrc(el.photo, el.w > 420);
  const { img, bottom } = polaroidParts(el);
  const pw = el.photo.width || 1;
  const ph = el.photo.height || 1;
  const crop = cropOf(el.photo, pw, ph, img.w, img.h);
  const k = img.w / crop.sw;
  const rings = el.faces ? faceRings(el.photo, pw, ph, img.w, img.h) : [];
  const m = enter(el, u, still);
  return (
    <motion.div
      className={`rc-photo rc-${el.frame}`}
      style={{ left: px(el.x, SLIDE_W), top: px(el.y, SLIDE_H), width: px(el.w, SLIDE_W), height: px(el.h, SLIDE_H) }}
      {...m}
    >
      <div className="rc-window" style={{ left: px(img.x, el.w), top: px(img.y, el.h), width: px(img.w, el.w), height: px(img.h, el.h) }}>
        {src && (
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              left: px(-crop.sx * k, img.w),
              top: px(-crop.sy * k, img.h),
              width: px(pw * k, img.w),
              height: px(ph * k, img.h),
              filter: el.blur ? `blur(${9 * u}px)` : undefined,
            }}
          />
        )}
        {rings.map((f, i) => (
          <motion.span
            key={i}
            className="rc-ring"
            style={{ left: px(f.cx - f.r, img.w), top: px(f.cy - f.r, img.h), width: px(2 * f.r, img.w), height: px(2 * f.r, img.h), borderWidth: Math.max(2, el.w * 0.008 * u) }}
            initial={still ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 11, stiffness: 260, delay: (el.at ?? 0) + 0.8 + i * 0.12 }}
          />
        ))}
      </div>
      {el.caption && (
        <span className="rc-caption" style={{ top: px(el.h - bottom, el.h), height: px(bottom, el.h), fontSize: el.w * 0.075 * u }}>
          {el.caption}
        </span>
      )}
      {el.stamp && (
        <motion.span
          className="rc-stamp"
          style={{ top: px(img.y + img.h * 0.55, el.h), fontSize: el.w * 0.085 * u, borderWidth: el.w * 0.085 * 0.16 * u }}
          initial={still ? false : { opacity: 0, scale: 2.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: -12 }}
          transition={{ type: "spring", damping: 13, stiffness: 420, delay: (el.at ?? 0) + 0.7 }}
        >
          {el.stamp}
        </motion.span>
      )}
    </motion.div>
  );
}

function BarsView({ el, u, still }: { el: BarsEl; u: number; still: boolean }) {
  const n = el.items.length;
  const max = Math.max(1, ...el.items.map((i) => i.value));
  const col = el.w / n;
  const barW = Math.min(110, col * 0.58);
  const labelH = 70;
  const valueH = 60;
  const room = el.h - labelH - valueH;
  return (
    <div className="rc-chart" style={{ left: px(el.x, SLIDE_W), top: px(el.y, SLIDE_H), width: px(el.w, SLIDE_W), height: px(el.h, SLIDE_H) }}>
      {el.items.map((it, i) => {
        const bh = Math.max(14, (it.value / max) * room);
        const cx = col * (i + 0.5);
        const delay = (el.at ?? 0) + i * 0.12;
        return (
          <div key={i}>
            <motion.div
              className="rc-bar"
              style={{
                left: px(cx - barW / 2, el.w),
                top: px(valueH + room - bh, el.h),
                width: px(barW, el.w),
                height: px(bh, el.h),
                background: it.hot ? el.hot : el.color,
                borderRadius: `${(barW / 2) * u}px ${(barW / 2) * u}px ${8 * u}px ${8 * u}px`,
              }}
              initial={still ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: "spring", damping: 16, stiffness: 120, delay }}
            />
            <motion.span
              className="rc-bar-value"
              style={{ left: px(cx, el.w), top: px(valueH + room - bh - 30, el.h), fontSize: 40 * u, color: el.ink, fontFamily: familyOf("serif") }}
              initial={still ? false : { opacity: 0, y: 20 * u }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.35 }}
            >
              {bnNum(it.value)}
            </motion.span>
            <span
              className="rc-bar-label"
              style={{ left: px(cx, el.w), top: px(el.h - labelH / 2, el.h), fontSize: 32 * u, color: el.ink, fontFamily: familyOf("body") }}
            >
              {it.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RouteView({ el, still }: { el: RouteEl; still: boolean }) {
  const d = el.points.map(([x, y], i) => `${i ? "L" : "M"}${(x * el.w).toFixed(1)} ${(y * el.h).toFixed(1)}`).join(" ");
  const ends = [el.points[0], el.points[el.points.length - 1]];
  const delay = el.at ?? 0;
  return (
    <svg
      className="rc-route"
      viewBox={`0 0 ${el.w} ${el.h}`}
      style={{ left: px(el.x, SLIDE_W), top: px(el.y, SLIDE_H), width: px(el.w, SLIDE_W), height: px(el.h, SLIDE_H) }}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={el.color}
        strokeWidth={8}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={still ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, ease: "easeInOut", delay }}
      />
      {el.points.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x * el.w}
          cy={y * el.h}
          r={7}
          fill={el.dot}
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + (i / el.points.length) * 2.2 }}
        />
      ))}
      {ends.map(([x, y], i) => (
        <motion.circle
          key={`e${i}`}
          cx={x * el.w}
          cy={y * el.h}
          r={18}
          fill={el.color}
          stroke={el.dot}
          strokeWidth={6}
          initial={still ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          style={{ originX: "50%", originY: "50%", transformBox: "fill-box" }}
          transition={{ type: "spring", damping: 10, stiffness: 300, delay: delay + (i ? 2.2 : 0) }}
        />
      ))}
    </svg>
  );
}

function ElView({ el, u, still }: { el: El; u: number; still: boolean }) {
  switch (el.k) {
    case "text":
      return <TextView el={el} u={u} still={still} />;
    case "count":
      return <CountView el={el} u={u} still={still} />;
    case "photo":
      return <PhotoView el={el} u={u} still={still} />;
    case "bars":
      return <BarsView el={el} u={u} still={still} />;
    case "route":
      return <RouteView el={el} still={still} />;
    case "box": {
      const m = enter(el, u, still);
      return (
        <motion.div
          className="rc-box"
          style={{
            left: px(el.x, SLIDE_W),
            top: px(el.y, SLIDE_H),
            width: px(el.w, SLIDE_W),
            height: px(el.h, SLIDE_H),
            background: el.fill,
            borderRadius: el.radius * u,
            border: el.stroke ? `${3 * u}px solid ${el.stroke}` : undefined,
          }}
          {...m}
        />
      );
    }
    case "chips": {
      const m = enter(el, u, still);
      return (
        <>
          {chipLayout(el).map((c, i) => (
            <motion.span
              key={i}
              className="rc-chip"
              style={{
                left: px(c.x, SLIDE_W),
                top: px(c.y, SLIDE_H),
                width: px(c.w, SLIDE_W),
                height: px(c.h, SLIDE_H),
                background: el.bg,
                color: el.color,
                fontSize: el.size * u,
                fontFamily: familyOf("body"),
              }}
              initial={m.initial}
              animate={m.animate}
              transition={{ ...m.transition, delay: ((m.transition as { delay?: number }).delay ?? 0) + i * 0.1 }}
            >
              {c.text}
            </motion.span>
          ))}
        </>
      );
    }
    case "sticker": {
      const def = stickerById(el.sticker);
      if (!def) return null;
      const m = enter(el, u, still);
      return (
        <motion.img
          className="rc-sticker"
          src={def.src}
          alt=""
          draggable={false}
          style={{ left: px(el.x, SLIDE_W), top: px(el.y, SLIDE_H), width: px(el.w, SLIDE_W) }}
          {...m}
        />
      );
    }
  }
}

// The pattern layer, drawn once at the screen's pixel density.
function PatternCanvas({ slide, u }: { slide: Slide; u: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || slide.pattern === "none" || !u) return;
    const k = u * Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(SLIDE_W * k);
    c.height = Math.round(SLIDE_H * k);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    paintPattern(ctx, slide, k);
  }, [slide, u]);
  if (slide.pattern === "none") return null;
  return <canvas ref={ref} className="rc-pattern" aria-hidden="true" />;
}

// The big ornament on its own layer, turning slowly.
function MotifCanvas({ slide, u, still }: { slide: Slide; u: number; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const calm = useReducedMotion();
  const size = slide.motifR * (slide.motif === "moon" ? 3 : 2);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !u) return;
    const k = u * Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = Math.round(size * k);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(k, k);
    paintMotif(ctx, slide.motif, size / 2, size / 2, slide.motifR, slide.motifColor);
  }, [slide, u, size]);
  if (slide.motif === "none") return null;
  const spin = !still && !calm && slide.motif !== "moon";
  return (
    <motion.canvas
      ref={ref}
      className="rc-motif"
      aria-hidden="true"
      style={{
        left: px(slide.motifAt[0] - size / 2, SLIDE_W),
        top: px(slide.motifAt[1] - size / 2, SLIDE_H),
        width: px(size, SLIDE_W),
        height: px(size, SLIDE_H),
      }}
      animate={spin ? { rotate: 360 } : slide.motif === "moon" && !still ? { y: [0, -14 * u, 0] } : undefined}
      transition={spin ? { duration: 90, repeat: Infinity, ease: "linear" } : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export const SlideView = memo(function SlideView({ slide, u, still = false }: { slide: Slide; u: number; still?: boolean }) {
  return (
    <div className="rc-slide" style={{ background: slide.bg }}>
      <MotifCanvas slide={slide} u={u} still={still} />
      <PatternCanvas slide={slide} u={u} />
      {slide.els.map((el) => (
        <ElView key={el.id} el={el} u={u} still={still} />
      ))}
    </div>
  );
});
