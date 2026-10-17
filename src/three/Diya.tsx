// A clay prodip (মাটির প্রদীপ): lathe-turned bowl, gold rim, painted dots,
// a pinched spout facing the viewer and a flickering flame that lights it.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { damp, radialTexture } from "./glow";
import { sceneLive, type SceneMode } from "./store";

// Flame position in the stage's space, read by the photo funnel every frame.
export const flameAnchor = new THREE.Vector3(0, 0, 1.2);

const POSE: Record<SceneMode, { y: number; scale: number }> = {
  hero: { y: -1.0, scale: 1.45 },
  processing: { y: -1.75, scale: 1.25 },
  results: { y: -0.55, scale: 0.8 },
};

const TILT = 0.32;
const FLAME_LOCAL = new THREE.Vector3(0, 0.66, 1.12);

export function Diya({ mode }: { mode: SceneMode }) {
  const group = useRef<THREE.Group>(null);
  const flameOuter = useRef<THREE.Sprite>(null);
  const flameInner = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);

  const parts = useMemo(() => {
    const profile = [
      [0, 0],
      [0.35, 0],
      [0.62, 0.05],
      [0.82, 0.16],
      [0.95, 0.32],
      [0.98, 0.39],
      [0.92, 0.42],
      [0.85, 0.34],
      [0.68, 0.25],
      [0.42, 0.19],
      [0, 0.17],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return {
      bowl: new THREE.LatheGeometry(profile, 64),
      clay: new THREE.MeshStandardMaterial({ color: "#9a3f22", roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide }),
      gold: new THREE.MeshStandardMaterial({ color: "#d9a441", roughness: 0.32, metalness: 0.75 }),
      chalk: new THREE.MeshStandardMaterial({ color: "#f3e3c3", roughness: 0.9 }),
      oil: new THREE.MeshStandardMaterial({
        color: "#4a2306",
        emissive: "#ff9a2e",
        emissiveIntensity: 0.35,
        roughness: 0.15,
      }),
      flame: radialTexture([
        [0, "rgba(255,255,240,1)"],
        [0.25, "rgba(255,214,120,0.95)"],
        [0.55, "rgba(255,130,40,0.55)"],
        [1, "rgba(255,80,20,0)"],
      ]),
      core: radialTexture([
        [0, "rgba(255,255,255,1)"],
        [0.5, "rgba(255,240,190,0.8)"],
        [1, "rgba(255,200,120,0)"],
      ]),
      haloTex: radialTexture([
        [0, "rgba(255,170,80,0.55)"],
        [0.4, "rgba(255,120,40,0.18)"],
        [1, "rgba(255,90,20,0)"],
      ]),
    };
  }, []);

  const dots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return [Math.sin(a) * 0.885, 0.24, Math.cos(a) * 0.885] as const;
      }),
    [],
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const pose = POSE[mode];
    g.position.y = damp(g.position.y, pose.y, 3, dt);
    const s = damp(g.scale.x, pose.scale, 3, dt);
    g.scale.setScalar(s);

    flameAnchor.copy(FLAME_LOCAL).applyEuler(g.rotation).multiplyScalar(s).add(g.position);

    sceneLive.flare = Math.max(0, sceneLive.flare - dt * 2.2);
    const flicker = 1 + 0.07 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 23.7 + 1.3) + 0.03 * Math.sin(t * 41.9);
    const boost = 1 + sceneLive.flare * 0.9;
    flameOuter.current?.scale.set(0.42 * boost, 0.86 * flicker * boost, 1);
    flameInner.current?.scale.set(0.17, 0.4 * flicker, 1);
    if (flameOuter.current) flameOuter.current.material.rotation = Math.sin(t * 2.3) * 0.08;
    halo.current?.scale.setScalar(2.6 * (0.95 + 0.05 * flicker) * (1 + sceneLive.flare * 0.6));
    if (light.current) light.current.intensity = (7 + 1.4 * Math.sin(t * 17) + 0.8 * Math.sin(t * 29)) * boost;
  });

  return (
    <group ref={group} rotation={[TILT, 0, 0]} position={[0, POSE[mode].y, 0]} scale={POSE[mode].scale}>
      <mesh geometry={parts.bowl} material={parts.clay} />
      <mesh position={[0, 0.405, 0]} rotation={[Math.PI / 2, 0, 0]} material={parts.gold}>
        <torusGeometry args={[0.95, 0.026, 10, 80]} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} material={parts.oil}>
        <circleGeometry args={[0.84, 48]} />
      </mesh>
      {dots.map((p, i) => (
        <mesh key={i} position={p as unknown as THREE.Vector3Tuple} material={parts.chalk}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
      ))}
      {/* pinched spout towards the viewer, wick inside it */}
      <mesh position={[0, 0.37, 0.97]} scale={[0.75, 0.32, 1.5]} material={parts.clay}>
        <sphereGeometry args={[0.24, 24, 16]} />
      </mesh>
      <mesh position={[0, 0.47, 1.1]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.14, 8]} />
        <meshStandardMaterial color="#2a160c" roughness={1} />
      </mesh>
      <group position={FLAME_LOCAL}>
        <sprite ref={halo}>
          <spriteMaterial map={parts.haloTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
        </sprite>
        <sprite ref={flameOuter} position={[0, 0.16, 0]}>
          <spriteMaterial map={parts.flame} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
        </sprite>
        <sprite ref={flameInner} position={[0, 0.08, 0.01]}>
          <spriteMaterial map={parts.core} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
        </sprite>
        <pointLight ref={light} color="#ffb060" intensity={7} distance={7} decay={2} position={[0, 0.25, 0.2]} />
      </group>
    </group>
  );
}
