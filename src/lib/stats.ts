import { dayLabel } from "./days";
import type { Photo } from "./types";

export type PujoStats = {
  total: number;
  people: number;
  thakur: number;
  busiestDay: { day: NonNullable<Photo["day"]>; label: string; count: number } | null;
  latest: Date | null;
  biggestBurst: number;
  duplicates: number;
  blurry: number;
  biggestGroup: { count: number; eyesClosed: number } | null;
  km: number | null;
};

const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

// Night owls: 1 am counts as "later" than 11 pm.
const nightMinutes = (d: Date) => {
  const h = d.getHours();
  return (h < 5 ? h + 24 : h) * 60 + d.getMinutes();
};

export function computeStats(photos: Photo[]): PujoStats {
  const readable = photos.filter((p) => p.status !== "unreadable");
  const people = readable.filter((p) => p.kind === "people").length;

  const perDay = new Map<NonNullable<Photo["day"]>, number>();
  for (const p of readable) if (p.day) perDay.set(p.day, (perDay.get(p.day) ?? 0) + 1);
  let busiestDay: PujoStats["busiestDay"] = null;
  for (const [day, count] of perDay) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { day, label: dayLabel(day) ?? "", count };
  }

  const timed = readable.filter((p) => p.fromExif && p.takenAt);
  const latest = timed.reduce<Date | null>(
    (best, p) => (!best || nightMinutes(p.takenAt!) > nightMinutes(best) ? p.takenAt! : best),
    null,
  );

  let biggestGroup: PujoStats["biggestGroup"] = null;
  for (const p of readable) {
    const f = p.faces;
    if (f && f.count >= 2 && (!biggestGroup || f.count > biggestGroup.count)) {
      biggestGroup = { count: f.count, eyesClosed: f.eyesClosed };
    }
  }

  // Distance only from photos that still carry GPS, ignoring car / metro jumps.
  const geo = timed.filter((p) => p.gps).sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime());
  let km: number | null = null;
  if (geo.length >= 6) {
    let total = 0;
    for (let i = 1; i < geo.length; i++) {
      const dt = geo[i].takenAt!.getTime() - geo[i - 1].takenAt!.getTime();
      const d = haversineKm(geo[i - 1].gps!, geo[i].gps!);
      if (dt < 3 * 3_600_000 && d < 8) total += d;
    }
    km = total >= 0.5 ? total : null;
  }

  return {
    total: readable.length,
    people,
    thakur: readable.length - people,
    busiestDay,
    latest,
    biggestBurst: Math.max(1, ...readable.map((p) => p.burstSize)),
    duplicates: readable.filter((p) => p.status === "duplicate").length,
    blurry: readable.filter((p) => p.status === "blurry").length,
    biggestGroup,
    km,
  };
}

export const DAY_PUNCH: Record<string, string> = {
  before: "পুজো শুরুর আগেই হাফ কলকাতা ঘোরা শেষ।",
  panchami: "পঞ্চমী থেকেই মাঠে নেমে পড়েছিলে।",
  shashthi: "ষষ্ঠীতেই এত? বাকি দিনগুলোর জন্য কিছু রেখেছিলে তো?",
  saptami: "সপ্তমী মানেই নতুন জামা, আর নতুন জামা মানেই ছবি।",
  ashtami: "অষ্টমী বলে কথা। শাড়ি-পাঞ্জাবি পরে ছবি না তুললে চলে?",
  navami: "নবমীর রাত। কাল তো সব শেষ, আজ যত পারো।",
  dashami: "দশমীতেই সবচেয়ে বেশি। যাওয়ার আগে মাকে ভালো করে দেখে নিলে।",
  after: "পুজো শেষ, তোমার ক্যামেরা শেষ হয়নি।",
};

export const dayIn = (label: string, day: string) =>
  day === "before" || day === "after" ? label : `${label}তে`;

