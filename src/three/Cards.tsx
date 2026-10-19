// The floating polaroids that orbit the prodip in the hero. They show real
// Pujo photos (npm run hero) until the visitor adds their own; then the
// visitor's photos take over, card by card, each with a little hop.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { damp } from "./glow";
import { sceneLive, useScene } from "./store";
import { CARD_H, CARD_W, makeSurface, paintPhoto, paintPlaceholder, type CardSurface } from "./textures";

type Slot = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  surface: CardSurface;
  base: number;
  tilt: number;
  opacity: number;
  hop: number; // 1 right after the card got a new photo, fading to 0
};

const GOLDEN = 2.39996;
const tmp = new THREE.Vector3();

export function CardPool({ count }: { count: number }) {
  const camera = useThree((s) => s.camera);
  const { pictures } = useScene();

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
      return { mesh, surface, base: i * GOLDEN, tilt: (s - 0.5) * 0.35, opacity: 0, hop: 0 };
    });
  }, [count]);

  useEffect(() => () => slots.forEach((s) => s.surface.texture.dispose()), [slots]);

  // The visitor's photos when there are any (one card after another),
  // otherwise the hero photos.
  useEffect(() => {
    if (!pictures.length) {
      slots.forEach((slot, i) => void paintPlaceholder(slot.surface, i));
      return;
    }
    const timers = slots.map((slot, i) =>
      window.setTimeout(() => {
        paintPhoto(slot.surface, pictures[i % pictures.length], null);
        slot.hop = 1;
      }, i * 70),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [slots, pictures]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const slow = sceneLive.reducedMotion ? 0.35 : 1;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const { mesh } = slot;
      const a = slot.base + t * 0.17 * slow;
      const r = 2.9 + 0.35 * Math.sin(i * 1.7);
      tmp.set(Math.cos(a) * r, -1.7 + (i / slots.length) * 3.8 + 0.14 * Math.sin(t * 0.8 + i), Math.sin(a) * r * 0.75);
      mesh.position.lerp(tmp, 1 - Math.exp(-3 * dt));
      slot.opacity = damp(slot.opacity, 1, 4, dt);
      slot.hop = Math.max(0, slot.hop - dt * 1.6);
      mesh.material.opacity = slot.opacity;
      mesh.scale.setScalar(0.92 * (1 + 0.28 * Math.sin(slot.hop * Math.PI)));
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
