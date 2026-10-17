// The floating polaroids. On the landing page they orbit the prodip; while
// photos are analysed they spiral down into the flame ("অগ্নিপরীক্ষা"):
// keepers fly back up in gold, blurry and duplicate shots burn away.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { flameAnchor } from "./Diya";
import { damp } from "./glow";
import { releaseFeed, sceneLive, type SceneMode, type Verdict } from "./store";
import { CARD_H, CARD_W, makeSurface, paintPhoto, paintPlaceholder, type CardSurface } from "./textures";

type SlotState = "orbit" | "travel" | "rise" | "burn" | "hidden";

type Slot = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  surface: CardSurface;
  base: number;
  tilt: number;
  phase: number;
  t: number;
  state: SlotState;
  verdict: Verdict;
  opacity: number;
  riseTo: THREE.Vector3;
};

const GOLDEN = 2.39996;
const CYCLE = 3.4;
const RISE_TIME = 1.5;
const BURN_TIME = 0.8;
const WHITE = new THREE.Color(1, 1, 1);
const GOLD = new THREE.Color(1.55, 1.25, 0.7);
const EMBER = new THREE.Color(1.6, 0.55, 0.2);
const tmp = new THREE.Vector3();
const tmpColor = new THREE.Color();

export function CardPool({ count, mode }: { count: number; mode: SceneMode }) {
  const camera = useThree((s) => s.camera);

  const slots = useMemo<Slot[]>(() => {
    const geo = new THREE.PlaneGeometry(1, CARD_H / CARD_W);
    return Array.from({ length: count }, (_, i) => {
      const surface = makeSurface();
      const mat = new THREE.MeshBasicMaterial({
        map: surface.texture,
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(0.92);
      const s = ((i * 7919) % 1000) / 1000;
      return {
        mesh,
        surface,
        base: i * GOLDEN,
        tilt: (s - 0.5) * 0.35,
        phase: i / count,
        t: 0,
        state: "orbit" as SlotState,
        verdict: "ok" as Verdict,
        opacity: 0,
        riseTo: new THREE.Vector3((s - 0.5) * 6, 4.2, -1 + s),
      };
    });
  }, [count]);

  useEffect(() => {
    slots.forEach((slot, i) => void paintPlaceholder(slot.surface, i));
    return () => slots.forEach((s) => s.surface.texture.dispose());
  }, [slots]);

  // Entering the funnel: placeholders get pulled into the flame first.
  useEffect(() => {
    slots.forEach((slot, i) => {
      if (mode === "processing" && slot.state === "orbit") {
        slot.state = "travel";
        slot.verdict = "duplicate";
        slot.phase = (i / slots.length) * 0.6;
      }
      if (mode === "hero" && slot.state !== "orbit") {
        slot.state = "orbit";
        void paintPlaceholder(slot.surface, i);
      }
    });
  }, [mode, slots]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const slow = sceneLive.reducedMotion ? 0.35 : 1;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const { mesh } = slot;
      let targetOpacity = 1;
      let color = WHITE;
      let scale = 0.92;

      if (mode === "results") {
        slot.state = "hidden";
      }

      switch (slot.state) {
        case "orbit": {
          const a = slot.base + t * 0.17 * slow;
          const r = 2.9 + 0.35 * Math.sin(i * 1.7);
          tmp.set(
            Math.cos(a) * r,
            -1.7 + (i / slots.length) * 3.8 + 0.14 * Math.sin(t * 0.8 + i),
            Math.sin(a) * r * 0.75,
          );
          mesh.position.lerp(tmp, 1 - Math.exp(-3 * dt));
          break;
        }
        case "travel": {
          slot.phase += (dt / CYCLE) * slow;
          const p = Math.min(1, slot.phase);
          const r = THREE.MathUtils.lerp(3.4, 0.15, Math.pow(p, 1.25));
          const a = slot.base + p * Math.PI * 3 + t * 0.35 * slow;
          tmp.set(
            flameAnchor.x + Math.cos(a) * r,
            THREE.MathUtils.lerp(3.3, flameAnchor.y + 0.35, Math.pow(p, 0.9)),
            flameAnchor.z - 0.4 + Math.sin(a) * r * 0.55,
          );
          mesh.position.lerp(tmp, 1 - Math.exp(-8 * dt));
          scale = THREE.MathUtils.lerp(0.95, 0.55, p);
          targetOpacity = Math.min(1, slot.phase * 6);
          if (slot.phase >= 1) {
            slot.t = 0;
            if (slot.verdict === "ok") {
              slot.state = "rise";
            } else {
              slot.state = "burn";
              sceneLive.flare = Math.min(1.2, sceneLive.flare + 0.6);
            }
          }
          break;
        }
        case "rise": {
          slot.t += dt * slow;
          const k = Math.min(1, slot.t / RISE_TIME);
          const e = 1 - Math.pow(1 - k, 3);
          tmp.copy(flameAnchor).lerp(slot.riseTo, e);
          tmp.y += Math.sin(k * Math.PI) * 0.8;
          mesh.position.copy(tmp);
          scale = 0.55 + 0.6 * Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.5);
          color = tmpColor.copy(GOLD).lerp(WHITE, k);
          targetOpacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
          if (k >= 1) slot.state = "hidden";
          break;
        }
        case "burn": {
          slot.t += dt * slow;
          const k = Math.min(1, slot.t / BURN_TIME);
          mesh.position.lerp(flameAnchor, 1 - Math.exp(-10 * dt));
          scale = 0.55 * (1 - k * 0.8);
          color = tmpColor.copy(EMBER).multiplyScalar(1 - k * 0.6);
          targetOpacity = 1 - k;
          if (k >= 1) slot.state = "hidden";
          break;
        }
        case "hidden": {
          targetOpacity = 0;
          if (mode === "processing") {
            const next = sceneLive.feed.shift();
            if (next) {
              paintPhoto(slot.surface, next.canvas, null);
              releaseFeed([next]);
              slot.verdict = next.verdict;
              slot.state = "travel";
              slot.phase = 0;
              mesh.position.set(Math.cos(slot.base) * 3.4, 3.4, Math.sin(slot.base) * 1.8);
            }
          }
          break;
        }
      }

      slot.opacity = damp(slot.opacity, targetOpacity, slot.state === "hidden" ? 6 : 10, dt);
      mesh.material.opacity = slot.opacity;
      mesh.material.color.copy(color);
      mesh.visible = slot.opacity > 0.01;
      mesh.scale.setScalar(damp(mesh.scale.x, scale, 8, dt));
      // Face the camera, with a little hand-held tilt.
      mesh.quaternion.copy(camera.quaternion);
      mesh.rotateZ(slot.tilt + Math.sin(t * 0.5 + i) * 0.04);
    }
  });

  return (
    <group>
      {slots.map((s, i) => (
        <primitive key={i} object={s.mesh} />
      ))}
    </group>
  );
}
