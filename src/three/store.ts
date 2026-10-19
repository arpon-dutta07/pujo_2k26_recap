// Bridge between the React UI and the 3D scene. The scene reads the mutable
// fields every frame; React subscribes only to the few that change rarely.
import { useSyncExternalStore } from "react";

type Shared = {
  // True while something covers the whole screen (the studio): stop drawing.
  hold: boolean;
  // The visitor's own photos for the orbiting polaroids, once they add some.
  pictures: Array<ImageBitmap | HTMLImageElement>;
};

let shared: Shared = { hold: false, pictures: [] };
const listeners = new Set<() => void>();

export const sceneLive = {
  pointer: { x: 0, y: 0 },
  flare: 0,
  reducedMotion: false,
};

export function setScene(patch: Partial<Shared>) {
  shared = { ...shared, ...patch };
  listeners.forEach((l) => l());
}

export function useScene(): Shared {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => shared,
  );
}
