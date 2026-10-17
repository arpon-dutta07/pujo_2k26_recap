// Everything the recap talks about, worked out from the analysed photos:
// which photos to show on which slide, the day chart and the walk.
import { PUJO_DAYS } from "../config";
import { dayLabel } from "../lib/days";
import type { PujoStats } from "../lib/stats";
import type { Photo } from "../lib/types";

export type RecapFacts = {
  stats: PujoStats;
  days: Array<{ key: NonNullable<Photo["day"]>; label: string; count: number }>;
  pujoDays: number; // Pujo days (Panchami to Dashami) with at least one photo
  top: Photo[]; // the AI's picks, cover first
  thakurPhoto: Photo | null;
  peoplePhoto: Photo | null;
  group: Photo | null;
  burst: Photo[]; // the kept shot of the biggest burst first, then its look-alikes
  latest: Photo | null;
  route: Array<[number, number]> | null;
  strip: Photo[]; // a spread of good photos for the photo mosaic
};

const good = (p: Photo) => p.status === "ok";
const byScore = (a: Photo, b: Photo) => b.score - a.score;
const night = (d: Date) => (d.getHours() < 5 ? d.getHours() + 24 : d.getHours()) * 60 + d.getMinutes();

// GPS points of the photos, in time order, without car or metro jumps,
// squeezed into a 0..1 box with the map's shape kept.
function walk(photos: Photo[]): Array<[number, number]> | null {
  const geo = photos
    .filter((p) => p.gps && p.takenAt && p.fromExif)
    .sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime());
  if (geo.length < 6) return null;
  const lat0 = (geo.reduce((s, p) => s + p.gps!.lat, 0) / geo.length) * (Math.PI / 180);
  let pts = geo.map((p) => [p.gps!.lon * Math.cos(lat0), -p.gps!.lat] as [number, number]);
  if (pts.length > 60) {
    const step = pts.length / 60;
    pts = Array.from({ length: 60 }, (_, i) => pts[Math.floor(i * step)]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0);
  if (span < 1e-5) return null;
  const pad = 0.08;
  const k = (1 - 2 * pad) / span;
  const ox = (1 - (x1 - x0) * k) / 2;
  const oy = (1 - (y1 - y0) * k) / 2;
  return pts.map(([x, y]) => [ox + (x - x0) * k, oy + (y - y0) * k]);
}

export function recapFacts(photos: Photo[], selected: string[], stats: PujoStats): RecapFacts {
  const readable = photos.filter((p) => p.status !== "unreadable");
  const byId = new Map(readable.map((p) => [p.id, p]));
  const top = selected.map((id) => byId.get(id)).filter((p): p is Photo => !!p);

  const order = ["before", ...PUJO_DAYS.map((d) => d.key), "after"] as const;
  const counts = new Map<string, number>();
  for (const p of readable) if (p.day) counts.set(p.day, (counts.get(p.day) ?? 0) + 1);
  const days = order
    .filter((k) => counts.has(k))
    .map((k) => ({ key: k as NonNullable<Photo["day"]>, label: dayLabel(k as Photo["day"]) ?? k, count: counts.get(k)! }));
  const pujoDays = days.filter((d) => d.key !== "before" && d.key !== "after").length;

  const pool = readable.filter(good).sort(byScore);
  const thakurPhoto = pool.find((p) => p.kind === "thakur") ?? null;
  const peoplePhoto = pool.find((p) => p.kind === "people") ?? null;

  const group =
    readable
      .filter((p) => (p.faces?.count ?? 0) >= 2)
      .sort((a, b) => b.faces!.count - a.faces!.count || b.score - a.score)[0] ?? null;

  // The biggest burst: the kept shot carries the burst size.
  const keeper = readable.filter((p) => p.burstSize >= 3).sort((a, b) => b.burstSize - a.burstSize)[0];
  const burst = keeper ? [keeper, ...readable.filter((p) => p.duplicateOf === keeper.id)] : [];

  const latest =
    readable
      .filter((p) => p.fromExif && p.takenAt)
      .sort((a, b) => night(b.takenAt!) - night(a.takenAt!))[0] ?? null;

  // One or two from every day, best first, for the mosaic.
  const strip: Photo[] = [];
  for (const d of days) strip.push(...pool.filter((p) => p.day === d.key).slice(0, 2));
  for (const p of pool) if (strip.length < 8 && !strip.includes(p)) strip.push(p);

  return {
    stats,
    days,
    pujoDays,
    top: top.length ? top : pool.slice(0, 12),
    thakurPhoto,
    peoplePhoto,
    group,
    burst,
    latest,
    route: walk(readable),
    strip: strip.slice(0, 8),
  };
}
