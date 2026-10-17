// A তোরণ of marigolds and mango leaves where the night hero meets the paper
// sections, like the ones tied over every pandal gate. Each strand sways on
// its own; a touch sets it swinging harder.
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

const UNIT = 96; // px between strands

function Marigold({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#e8780c" />
      <circle cx={cx} cy={cy} r={r * 0.82} fill="#f59a14" stroke="#ffbf3d" strokeWidth={r * 0.32} strokeDasharray={`${r * 0.34} ${r * 0.3}`} />
      <circle cx={cx} cy={cy} r={r * 0.36} fill="#ffc94d" />
    </g>
  );
}

function Strand({ i, still }: { i: number; still: boolean }) {
  const [kick, setKick] = useState(0);
  const long = i % 3 === 1;
  const flowers = long ? [24, 41, 57, 72] : [24, 41, 57];
  const leafY = flowers[flowers.length - 1] + 10;
  const swing = 3 + (i % 4);
  return (
    <motion.g
      // Swings from the knot on the rope: top centre of the strand.
      style={{ originX: 0.5, originY: 0 }}
      animate={
        still
          ? undefined
          : { rotate: kick ? [0, 14, -10, 6, -3, 0] : [-swing, swing] }
      }
      transition={
        kick
          ? { duration: 1.6, ease: "easeOut" }
          : { duration: 2.2 + (i % 5) * 0.35, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: (i % 7) * 0.2 }
      }
      onAnimationComplete={() => kick && setKick(0)}
      onPointerEnter={() => !still && setKick((k) => k + 1)}
    >
      <line x1={48} y1={12} x2={48} y2={leafY} stroke="#7a3b12" strokeWidth={1.2} />
      {flowers.map((y, k) => (
        <Marigold key={k} cx={48} cy={y} r={k === 0 ? 8.5 : 7.5} />
      ))}
      <path
        d={`M48 ${leafY - 2} C 40 ${leafY + 8} 41 ${leafY + 22} 48 ${leafY + 30} C 55 ${leafY + 22} 56 ${leafY + 8} 48 ${leafY - 2} Z`}
        fill="#1d6b4c"
      />
      <path d={`M48 ${leafY} L48 ${leafY + 26}`} stroke="#5fa47d" strokeWidth={1} />
    </motion.g>
  );
}

export function Garland({ count = 30 }: { count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Only sways while on screen.
  const seen = useInView(ref);
  const still = (useReducedMotion() ?? false) || !seen;
  return (
    <div className="garland" aria-hidden="true" ref={ref}>
      <svg viewBox={`0 0 ${UNIT * count} 120`} height="120" width={UNIT * count} preserveAspectRatio="xMinYMin meet">
        {Array.from({ length: count }, (_, i) => (
          <g key={i} transform={`translate(${i * UNIT} 0)`}>
            <path d={`M0 4 Q ${UNIT / 2} 22 ${UNIT} 4`} fill="none" stroke="#1d6b4c" strokeWidth={3} />
            <Strand i={i} still={still} />
          </g>
        ))}
      </svg>
    </div>
  );
}
