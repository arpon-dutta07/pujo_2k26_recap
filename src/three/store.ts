// Bridge between the React UI and the 3D scene. The scene reads the mutable
// fields every frame; React subscribes only to the few that change rarely.
import { useSyncExternalStore } from "react";

export type SceneMode = "hero" | "processing" | "results";
export type Verdict = "ok" | "blurry" | "duplicate";

export type FeedItem = { canvas: HTMLCanvasElement; verdict: Verdict };

type Shared = {
  mode: SceneMode;
  ring: { url: string; label: string | null }[];
  // True while something covers the whole screen (the template studio): stop drawing.
  hold: boolean;
};

let shared: Shared = { mode: "hero", ring: [], hold: false };
const listeners = new Set<() => void>();

export const sceneLive = {
  feed: [] as FeedItem[],
  pointer: { x: 0, y: 0 },
  scrollY: 0,
  spin: { velocity: 0, dragging: false },
  flare: 0,
  reducedMotion: false,
};

// Phones get a tighter ring so each card stays big enough to recognise.
export const ringRadius = (count: number, narrow: boolean) =>
  narrow ? Math.min(2.8, Math.max(2.0, count * 0.2)) : Math.min(4.3, Math.max(2.3, count * 0.3));

export function setScene(patch: Partial<Shared>) {
  shared = { ...shared, ...patch };
  if (patch.mode && patch.mode !== "processing") sceneLive.feed.length = 0;
  listeners.forEach((l) => l());
}

export function pushFeed(item: FeedItem) {
  sceneLive.feed.push(item);
  // The funnel shows a sample; never let the queue run away on fast machines.
  if (sceneLive.feed.length > 24) sceneLive.feed.splice(0, sceneLive.feed.length - 24);
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
