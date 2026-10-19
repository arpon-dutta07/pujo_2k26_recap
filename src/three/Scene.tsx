import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CardPool } from "./Cards";
import { Diya } from "./Diya";
import { Embers } from "./Embers";
import { damp } from "./glow";
import { sceneLive, useScene } from "./store";

const isSmallScreen = () => Math.min(window.innerWidth, window.innerHeight) < 640;

// Where the whole stage sits on this screen. Sizes are in world units at
// z=0 (vw x vh is what the camera sees there), so it fits any window. The
// orbit is about 7.4 wide and 5.8 tall around the prodip.
function stagePose(vw: number, vh: number) {
  if (vw / vh > 1.1) {
    const s = Math.min(1, (vw * 0.48) / 7.4, (vh * 0.9) / 5.8);
    return { x: vw * 0.26, y: -0.05, s };
  }
  const s = Math.min(0.75, (vw * 0.98) / 7.4, (vh * 0.44) / 5.8);
  return { x: 0, y: vh * 0.5 - vh * 0.24, s };
}

function Stage() {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const small = isSmallScreen();
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const pose = stagePose(viewport.width, viewport.height);
    g.position.x = damp(g.position.x, pose.x, 2.5, dt);
    g.position.y = damp(g.position.y, pose.y, 2.5, dt);
    g.scale.setScalar(damp(g.scale.x, pose.s, 2.5, dt));
    const { x, y } = sceneLive.pointer;
    g.rotation.y = damp(g.rotation.y, x * 0.22, 2, dt);
    g.rotation.x = damp(g.rotation.x, -y * 0.1, 2, dt);
  });

  return (
    <group ref={group}>
      <Diya />
      <CardPool count={small ? 16 : 22} />
    </group>
  );
}

// The scene lives inside the hero and scrolls away with it. Once the hero is
// off screen, or the studio covers everything, the canvas stops drawing so
// scrolling stays smooth.
function useRunning(hold: boolean) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = document.querySelector(".hero");
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
  }, []);
  return inView && !hold;
}

export function Scene() {
  const { hold } = useScene();
  const running = useRunning(hold);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      sceneLive.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      sceneLive.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    sceneLive.reducedMotion = mq.matches;
    const onMq = () => (sceneLive.reducedMotion = mq.matches);
    window.addEventListener("pointermove", onMove, { passive: true });
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("pointermove", onMove);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const small = isSmallScreen();
  return (
    <div className="scene scene-docked" aria-hidden="true">
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
