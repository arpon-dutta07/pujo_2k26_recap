// Warm sparks drifting up through the scene, like dhunuchi smoke catching the light.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { radialTexture } from "./glow";
import { sceneLive } from "./store";

export function Embers({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const { geometry, material, speed, phase } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const phase = new Float32Array(count);
    const palette = [new THREE.Color("#ffcf7a"), new THREE.Color("#ff9440"), new THREE.Color("#ffe9b8")];
    // Fixed seed: same sky every visit.
    let s = 42;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 14;
      pos[i * 3 + 1] = (rnd() - 0.5) * 9;
      pos[i * 3 + 2] = -4 + rnd() * 6;
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
      speed[i] = 0.15 + rnd() * 0.45;
      phase[i] = rnd() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: radialTexture([
        [0, "rgba(255,255,255,1)"],
        [0.3, "rgba(255,255,255,0.5)"],
        [1, "rgba(255,255,255,0)"],
      ]),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    return { geometry, material, speed, phase };
  }, [count]);

  useFrame((state, dt) => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const k = sceneLive.reducedMotion ? 0.25 : 1;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speed[i] * dt * k;
      arr[i * 3] += Math.sin(t * 0.6 + phase[i]) * 0.003 * k;
      if (arr[i * 3 + 1] > 4.8) arr[i * 3 + 1] = -4.8;
    }
    attr.needsUpdate = true;
    material.opacity = 0.7 + 0.15 * Math.sin(t * 1.3);
  });

  return <points ref={points} geometry={geometry} material={material} />;
}
