// A card that leans toward your finger or cursor, with a moving gold sheen.
// When nobody touches it, it sways a little on its own.
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";

export function TiltCard({ children, max = 14, className = "" }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const touching = useRef(false);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useMotionValue(50);
  const sy = useMotionValue(30);
  const springX = useSpring(rx, { stiffness: 140, damping: 16 });
  const springY = useSpring(ry, { stiffness: 140, damping: 16 });
  const sheen = useMotionTemplate`radial-gradient(circle at ${sx}% ${sy}%, rgba(255,240,200,0.55), rgba(255,200,120,0.12) 35%, transparent 60%)`;

  useAnimationFrame((t) => {
    if (touching.current || reduced) return;
    const s = t / 1000;
    rx.set(Math.sin(s * 0.7) * max * 0.25);
    ry.set(Math.cos(s * 0.5) * max * 0.35);
    sx.set(50 + Math.cos(s * 0.5) * 30);
    sy.set(35 + Math.sin(s * 0.7) * 20);
  });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || reduced) return;
    touching.current = true;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    sx.set(px * 100);
    sy.set(py * 100);
  };
  const onLeave = () => {
    touching.current = false;
  };

  return (
    <div className={`tilt ${className}`} ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} onPointerUp={onLeave}>
      <motion.div className="tilt-inner" style={{ rotateX: springX, rotateY: springY }}>
        {children}
        <motion.div className="tilt-sheen" style={{ background: sheen }} />
      </motion.div>
    </div>
  );
}
