import { DAY_ORDER } from "./days";
import { hamming } from "./image";
import type { Photo } from "./types";

type GroupKey = (typeof DAY_ORDER)[number];
const groupOf = (p: Photo): GroupKey => p.day ?? "unknown";
const time = (p: Photo) => p.takenAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

const PEOPLE_SHARE = 0.6;
const TOO_SIMILAR_BITS = 12;

// Picks `n` photos that tell the whole Pujo: every day gets a turn, people and
// thakur are mixed, and look-alikes are skipped. Returns ids, cover first.
export function selectBest(photos: Photo[], n: number): string[] {
  let pool = photos.filter((p) => p.status === "ok");
  if (pool.length < n) {
    const fill = photos
      .filter((p) => p.status === "blurry")
      .sort((a, b) => b.score - a.score)
      .slice(0, n - pool.length);
    pool = [...pool, ...fill];
  }
  if (!pool.length) return [];
  n = Math.min(n, pool.length);

  const groups = new Map<GroupKey, Photo[]>();
  for (const p of pool) groups.set(groupOf(p), [...(groups.get(groupOf(p)) ?? []), p]);
  const keys = DAY_ORDER.filter((k) => groups.has(k));

  // Quotas: one per day first, the rest by largest remainder on group size.
  const quota = new Map<GroupKey, number>();
  const seeded = [...keys].sort((a, b) => groups.get(b)!.length - groups.get(a)!.length).slice(0, n);
  for (const k of seeded) quota.set(k, 1);
  let left = n - seeded.length;
  if (left > 0) {
    const spare = seeded.map((k) => ({ k, extra: groups.get(k)!.length - 1 }));
    const total = spare.reduce((s, x) => s + x.extra, 0) || 1;
    const shares = spare.map((x) => ({ ...x, exact: (x.extra / total) * left }));
    for (const s of shares) {
      const add = Math.min(Math.floor(s.exact), s.extra);
      quota.set(s.k, quota.get(s.k)! + add);
      left -= add;
    }
    shares.sort((a, b) => (b.exact % 1) - (a.exact % 1));
    while (left > 0) {
      const room = shares.find((s) => quota.get(s.k)! < groups.get(s.k)!.length);
      if (!room) break;
      quota.set(room.k, quota.get(room.k)! + 1);
      left--;
      shares.push(shares.splice(shares.indexOf(room), 1)[0]);
    }
  }

  const chosen: Photo[] = [];
  const tooSimilar = (p: Photo) =>
    chosen.some((c) => c.hash && p.hash && hamming(c.hash, p.hash) <= TOO_SIMILAR_BITS);

  for (const k of seeded) {
    const want = quota.get(k)!;
    const byScore = [...groups.get(k)!].sort((a, b) => b.score - a.score);
    const people = byScore.filter((p) => p.kind === "people");
    const thakur = byScore.filter((p) => p.kind === "thakur");
    const picked: Photo[] = [];
    const take = (list: Photo[], strict: boolean) => {
      const i = list.findIndex((p) => !picked.includes(p) && (!strict || !tooSimilar(p)));
      if (i < 0) return false;
      picked.push(list[i]);
      chosen.push(list[i]);
      return true;
    };
    while (picked.length < want) {
      const peopleNow = picked.filter((p) => p.kind === "people").length;
      const wantPeople = peopleNow < Math.round((picked.length + 1) * PEOPLE_SHARE);
      const first = wantPeople ? people : thakur;
      const second = wantPeople ? thakur : people;
      if (take(first, true) || take(second, true) || take(byScore, false)) continue;
      break;
    }
  }

  chosen.sort((a, b) => time(a) - time(b) || a.index - b.index);
  const cover = [...chosen].sort((a, b) => b.score - a.score)[0];
  return [cover.id, ...chosen.filter((p) => p !== cover).map((p) => p.id)];
}

// Replacement candidates for one slot: same day first, best first.
export function alternativesFor(photos: Photo[], chosenIds: string[], id: string, limit = 12): Photo[] {
  const target = photos.find((p) => p.id === id);
  const taken = new Set(chosenIds);
  const free = photos.filter((p) => !taken.has(p.id) && (p.status === "ok" || p.status === "blurry"));
  const sameDay = free.filter((p) => target && p.day === target.day).sort((a, b) => b.score - a.score);
  const others = free.filter((p) => !sameDay.includes(p)).sort((a, b) => b.score - a.score);
  return [...sameDay, ...others].slice(0, limit);
}

// Photos the visitor tapped during the photo check always make the cut, in
// place of the weakest automatic picks. A tapped photo becomes the cover;
// the rest stay in time order, as selectBest returns them.
export function withPinned(photos: Photo[], picked: string[], pinned: ReadonlySet<string>, n: number): string[] {
  const byId = new Map(photos.map((p) => [p.id, p]));
  const pins = [...pinned].map((id) => byId.get(id)).filter((p): p is Photo => !!p && p.status !== "unreadable");
  if (!pins.length) return picked;
  const pinIds = new Set(pins.map((p) => p.id));
  const auto = picked
    .filter((id) => !pinIds.has(id))
    .map((id) => byId.get(id)!)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, n - pins.length));
  const all = [...pins, ...auto].sort((a, b) => time(a) - time(b) || a.index - b.index);
  const cover = [...pins].sort((a, b) => b.score - a.score)[0];
  return [cover.id, ...all.filter((p) => p !== cover).map((p) => p.id)];
}
