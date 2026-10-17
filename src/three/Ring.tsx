// Results: the chosen photos circle the prodip like an arati. Drag to spin.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { damp } from "./glow";
import { ringRadius, sceneLive } from "./store";
import { CARD_H, CARD_W, loadImage, makeSurface, paintPhoto, type CardSurface } from "./textures";

type RingCard = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  surface: CardSurface;
  ready: boolean;
  born: number;
};

export function Ring({ items, active }: { items: { url: string; label: string | null }[]; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const started = useRef(0);

  const cards = useMemo<RingCard[]>(() => {
    const geo = new THREE.PlaneGeometry(1, CARD_H / CARD_W);
    return items.map(() => {
      const surface = makeSurface();
      const mat = new THREE.MeshBasicMaterial({
        map: surface.texture,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      return { mesh: new THREE.Mesh(geo, mat), surface, ready: false, born: -1 };
    });
  }, [items]);

  useEffect(() => {
    let alive = true;
    started.current = -1;
    cards.forEach((card, i) => {
      loadImage(items[i].url)
        .then((img) => {
          if (!alive) return;
          paintPhoto(card.surface, img, items[i].label);
          card.ready = true;
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
      cards.forEach((c) => {
        c.surface.texture.dispose();
        c.mesh.material.dispose();
      });
    };
  }, [cards, items]);

  const narrow = useThree((s) => s.viewport.aspect < 1.1);
  const radius = ringRadius(items.length, narrow);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (started.current < 0) started.current = t;
    const spin = sceneLive.spin;
    if (!spin.dragging) spin.velocity = damp(spin.velocity, 0, 1.6, dt);
    angle.current += (sceneLive.reducedMotion ? 0.04 : 0.16) * dt + spin.velocity * dt;

    const n = cards.length;
    cards.forEach((card, i) => {
      const { mesh } = card;
      const a = angle.current + (i / n) * Math.PI * 2;
      const delay = i * 0.07;
      const k = THREE.MathUtils.clamp((t - started.current - delay) / 1.1, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;
      const y = THREE.MathUtils.lerp(-4, 0.45 + 0.12 * Math.sin(t * 0.9 + i), e);
      mesh.position.set(x, y, z);
      mesh.rotation.set(0, a, 0);
      mesh.scale.setScalar(1.05);
      // Cards at the back of the ring fade, which reads as depth.
      const front = (z / radius + 1) / 2;
      const target = active && card.ready ? (0.28 + 0.72 * front) * e : 0;
      mesh.material.opacity = damp(mesh.material.opacity, target, 6, dt);
      mesh.visible = mesh.material.opacity > 0.01;
    });
  });

  return (
    <group ref={group}>
      {cards.map((c, i) => (
        <primitive key={i} object={c.mesh} />
      ))}
    </group>
  );
}
