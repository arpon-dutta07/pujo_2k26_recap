import { bnKm, bnNum, bnTime } from "./bn";
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

const DAY_PUNCH: Record<string, string> = {
  before: "পুজো শুরুর আগেই অর্ধেক ঠাকুর দেখা শেষ!",
  panchami: "পঞ্চমী থেকেই ফুল ফর্মে।",
  shashthi: "ষষ্ঠী থেকেই ফুল ফর্মে।",
  saptami: "সপ্তমীতেই ব্যাটারি শেষ করার প্ল্যান ছিল?",
  ashtami: "অঞ্জলির চেয়ে ফটোসেশন বেশি জরুরি ছিল।",
  navami: "নবমীর রাত, মন খারাপের আগে শেষ চেষ্টা।",
  dashami: "বিসর্জনের আগে সবটা ধরে রাখতে চেয়েছিলে।",
  after: "পুজো শেষ, ক্যামেরা থামেনি।",
};

const dayIn = (label: string, day: string) =>
  day === "before" || day === "after" ? label : `${label}তে`;

// Funny one-liners, most personal first. Only lines the data can back up.
export function roastLines(s: PujoStats): string[] {
  const lines: string[] = [];
  if (s.total >= 5) {
    lines.push(
      s.people > s.thakur
        ? `ঠাকুরের ছবি ${bnNum(s.thakur)}টা, নিজের ${bnNum(s.people)}টা। মা সব দেখছেন।`
        : `ঠাকুরের ছবি ${bnNum(s.thakur)}টা, নিজের মাত্র ${bnNum(s.people)}টা। এ বছর সত্যিই ঠাকুর দেখতে বেরিয়েছিলে।`,
    );
  }
  if (s.biggestGroup && s.biggestGroup.count >= 3) {
    lines.push(
      s.biggestGroup.eyesClosed > 0
        ? `সবচেয়ে বড় গ্রুপ ছবিতে ${bnNum(s.biggestGroup.count)} জন। তার মধ্যে ${bnNum(s.biggestGroup.eyesClosed)} জনের চোখ বন্ধ।`
        : `সবচেয়ে বড় গ্রুপ ছবিতে ${bnNum(s.biggestGroup.count)} জন, আর সবার চোখ খোলা। এটাই পুজোর আসল মিরাকল।`,
    );
  }
  if (s.biggestBurst >= 4) {
    lines.push(`একই পোজে ${bnNum(s.biggestBurst)}টা ছবি। ভালো এসেছে একটাই, সেটা রেখে দিয়েছি।`);
  }
  if (s.latest) {
    const h = s.latest.getHours();
    if (h < 5) lines.push(`শেষ ছবি ${bnTime(s.latest)}-এ। ঘুম? সেটা আবার কী?`);
    else if (h >= 22) lines.push(`${bnTime(s.latest)}-এও ক্যামেরা চলছিল।`);
  }
  if (s.busiestDay && s.busiestDay.count >= 3) {
    lines.push(
      `সবচেয়ে বেশি ছবি ${dayIn(s.busiestDay.label, s.busiestDay.day)}: ${bnNum(s.busiestDay.count)}টা। ${DAY_PUNCH[s.busiestDay.day] ?? ""}`.trim(),
    );
  }
  if (s.km) lines.push(`ছবির লোকেশন বলছে, পুজোয় মোট ${bnKm(s.km)} কিমি ঘুরেছ।`);
  if (s.blurry >= 5) lines.push(`${bnNum(s.blurry)}টা ছবি ঝাপসা। ভিড়ে হাত কেঁপেছিল, বুঝি।`);
  return lines;
}
