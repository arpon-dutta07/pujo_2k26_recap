import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CardPool } from "./Cards";
import { Diya } from "./Diya";
import { Embers } from "./Embers";
import { damp } from "./glow";
import { Ring } from "./Ring";
import { ringRadius, sceneLive, useScene, type SceneMode } from "./store";

const isSmallScreen = () => Math.min(window.innerWidth, window.innerHeight) < 640;

// Where the whole stage sits for each screen. Sizes are in world units at z=0
// (vw x vh is what the camera sees there), so it fits any window.
function stagePose(mode: SceneMode, vw: number, vh: number, ringRadius: number) {
  const wide = vw / vh > 1.1;
  const pxToWorld = vh / window.innerHeight;
  if (mode === "hero") {
    // Orbit is about 7.4 wide and 5.8 tall around the prodip.
    if (wide) {
      const s = Math.min(1, (vw * 0.48) / 7.4, (vh * 0.9) / 5.8);
      return { x: vw * 0.26, y: -0.05, s };
    }
    const s = Math.min(0.75, (vw * 0.98) / 7.4, (vh * 0.44) / 5.8);
    return { x: 0, y: vh * 0.5 - vh * 0.24, s };
  }
  if (mode === "processing") {
    // Funnel: from y 3.3 down to the flame, about 7.4 wide. The panel covers the bottom.
    const free = wide ? 0.62 : 0.5;
    const s = Math.min(1, (vw * 0.92) / 7.4, (vh * free) / 6.4);
    return { x: 0, y: vh * 0.5 - (vh * free) / 2 - 0.75 * s, s };
  }
  // Results: the ring sits in the page's top band and scrolls away with it.
  const stagePx = Math.min(560, Math.max(320, window.innerHeight * 0.52));
  const centerY = vh * 0.5 - (76 + stagePx / 2 - sceneLive.scrollY) * pxToWorld;
  // On phones the ring may run past the screen edges; the front card matters most.
  const s = Math.min(1, (vw * (wide ? 0.94 : 1.4)) / (2 * ringRadius + 1.4), (stagePx * pxToWorld) / 3.6);
  return { x: 0, y: centerY - 0.15 * s, s };
}

function Stage() {
  const { mode, ring } = useScene();
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const small = isSmallScreen();
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const radius = ringRadius(ring.length, viewport.aspect < 1.1);
    const pose = stagePose(mode, viewport.width, viewport.height, radius);
    g.position.x = damp(g.position.x, pose.x, 2.5, dt);
    g.position.y = damp(g.position.y, pose.y, mode === "results" ? 7 : 2.5, dt);
    g.scale.setScalar(damp(g.scale.x, pose.s, 2.5, dt));
    const { x, y } = sceneLive.pointer;
    const amount = mode === "results" ? 0.25 : 1;
    g.rotation.y = damp(g.rotation.y, x * 0.22 * amount, 2, dt);
    g.rotation.x = damp(g.rotation.x, -y * 0.1 * amount + (mode === "results" ? 0.12 : 0), 2, dt);
  });

  return (
    <group ref={group}>
      <Diya mode={mode} />
      <CardPool count={small ? 16 : 22} mode={mode} />
      {ring.length > 0 && <Ring items={ring} active={mode === "results"} />}
    </group>
  );
}

// On the landing page the scene lives inside the hero and scrolls away with it.
// Once its section (hero, or the ring band on results) is off screen, or the
// studio covers everything, the canvas stops drawing so scrolling stays smooth.
function useRunning(mode: SceneMode, hold: boolean) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const selector = mode === "hero" ? ".hero" : mode === "results" ? ".ring-stage" : null;
    if (!selector) {
      setInView(true);
      return;
    }
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = document.querySelector(selector);
      setInView(!el || el.getBoundingClientRect().bottom > 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    // The screen's own element mounts after the page transition.
    const late = window.setTimeout(check, 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode]);
  return inView && !hold;
}

export function Scene() {
  const { mode, hold } = useScene();
  const running = useRunning(mode, hold);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      sceneLive.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      sceneLive.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    sceneLive.reducedMotion = mq.matches;
    const onMq = () => (sceneLive.reducedMotion = mq.matches);
    const onScroll = () => (sceneLive.scrollY = window.scrollY);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const small = isSmallScreen();
  return (
    <div className={mode === "hero" ? "scene scene-docked" : "scene"} aria-hidden="true">
      <Canvas
        frameloop={running ? "always" : "never"}
        dpr={[1, small ? 1.5 : 2]}
        camera={{ position: [0, 0.3, 10], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <fog attach="fog" args={["#14091c", 9, 19]} />
        <ambientLight intensity={0.35} color="#ffd9b0" />
        <hemisphereLight args={["#ffcf9a", "#26102e", 0.5]} />
        <Stage />
        <Embers count={small ? 70 : 150} />
      </Canvas>
      <div className="vignette" />
    </div>
  );
}
