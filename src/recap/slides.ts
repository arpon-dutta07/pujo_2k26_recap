// The recap deck: up to ten slides built from what the photo check found.
// Slides only appear when the photos back them up, and every joke is about
// the visitor's own numbers.
import { SITE } from "../config";
import { stickerById } from "../editor/stickers";
import { bnDayPart, bnKm, bnNum } from "../lib/bn";
import { dayLabel } from "../lib/days";
import { DAY_PUNCH, dayIn } from "../lib/stats";
import type { Photo } from "../lib/types";
import type { RecapFacts } from "./facts";
import { polaroidHeightFor } from "./measure";
import type { El, PhotoEl, Slide } from "./types";

const C = {
  night: "#12081a",
  night2: "#1d0d2a",
  midnight: "#0c0512",
  sindoor: "#c8151d",
  deep: "#8e0f1e",
  deeper: "#6e0a17",
  paper: "#fff7ea",
  cream: "#fbead0",
  marigold: "#ffb52e",
  mari: "#f5a01a",
  kajal: "#2b0b12",
  kajal2: "#6f4a4c",
  ink: "#fff3e2",
  muted: "#dcc6b4",
};

let uid = 0;

// A sticker's width so it fits a box, keeping its shape (they are all sizes).
function fit(sticker: string, maxW: number, maxH: number) {
  const d = stickerById(sticker);
  const w = d ? Math.min(maxW, (maxH * d.w) / d.h) : maxW;
  return { w, h: d ? (w * d.h) / d.w : w };
}

const id = () => `e${uid++}`;

const kicker = (text: string, color: string, y = 190): El => ({
  k: "text",
  id: id(),
  x: 90,
  y,
  w: 900,
  text,
  size: 44,
  font: "body",
  weight: 600,
  color,
  enter: "fade",
  at: 0.1,
});

const polaroid = (photo: Photo, x: number, y: number, w: number, rotate: number, extra: Partial<PhotoEl> = {}): PhotoEl => ({
  k: "photo",
  id: id(),
  photo,
  x,
  y,
  w,
  h: w * 1.18,
  frame: "polaroid",
  rotate,
  enter: "drop",
  ...extra,
});

const timeOf = (d: Date) => {
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${bnNum(h)}:${bnNum(String(d.getMinutes()).padStart(2, "0"))}`;
};

const caption = (p: Photo) => {
  const day = dayLabel(p.day);
  const time = p.fromExif && p.takenAt ? `${bnDayPart(p.takenAt)} ${timeOf(p.takenAt)}` : null;
  return [day, time].filter(Boolean).join(" · ") || undefined;
};

// ---------- the personality ----------

type Persona = { title: string; short: string; line: string; sticker: string };

function persona(f: RecapFacts): Persona {
  const s = f.stats;
  const lateH = s.latest ? s.latest.getHours() : 12;
  if (s.latest && lateH >= 1 && lateH < 5)
    return {
      title: "রাতজাগা পেঁচা",
      short: "রাতজাগা পেঁচা",
      line: "সন্ধে থেকে ভোর, তোমার পুজো রাতেই জমে। মা লক্ষ্মীর পেঁচাও এত রাত জাগে না।",
      sticker: "s16-bonedi-bari-6",
    };
  if ((s.km ?? 0) >= 8)
    return {
      title: "প্যান্ডেল হপার",
      short: "প্যান্ডেল হপার",
      line: "Google Maps-এ প্যান্ডেলের লিস্ট বানিয়ে ঘুরেছ। এক ঘণ্টার লাইনেও তোমার আপত্তি নেই।",
      sticker: "s04-shajgoj-8",
    };
  if ((s.biggestGroup?.count ?? 0) >= 7)
    return {
      title: "গ্রুপ ছবির ক্যাপ্টেন",
      short: "ক্যাপ্টেন",
      line: "'সবাই একটু চেপে দাঁড়া' কথাটা এবারও তুমিই বলেছ।",
      sticker: "s14-pandal-4",
    };
  if (s.people >= 2 * Math.max(1, s.thakur) && s.people >= 15)
    return {
      title: "সেলফি এক্সপার্ট",
      short: "সেলফি এক্সপার্ট",
      line: "প্যান্ডেলে ঢুকে আগে আলোটা দেখে নাও, তারপর অ্যাঙ্গেল। ঠাকুর দেখা তার পরে।",
      sticker: "s04-shajgoj-9",
    };
  if (s.biggestBurst >= 6)
    return {
      title: "বার্স্ট মোড",
      short: "বার্স্ট মোড",
      line: "একটা ভালো ছবির জন্য কুড়িবার ক্লিক। কোনো ব্যাপার না, আমরা বুঝি।",
      sticker: "s15-mela-5",
    };
  if (s.thakur >= s.people)
    return {
      title: "ঠাকুর হান্টার",
      short: "ঠাকুর হান্টার",
      line: "প্রতিমা, চালচিত্র, আলো, সব খুঁটিয়ে তুলেছ। শুধু নিজের একটা ছবি তুলতে ভুলে গেছ।",
      sticker: "s13-thakurer-shaj-1",
    };
  return f.pujoDays >= 4
    ? {
        title: "পুজো-পাগল",
        short: "পুজো-পাগল",
        line: "পাঁচ দিনের একটাও বাদ যায়নি। পাড়ার পুজো কমিটি তোমাকে ভালো করেই চেনে।",
        sticker: "s14-pandal-5",
      }
    : {
        title: "পুজো-পাগল",
        short: "পুজো-পাগল",
        line: "ছবি কম, কিন্তু আড্ডা নিশ্চয়ই কম হয়নি।",
        sticker: "s14-pandal-5",
      };
}

// ---------- the slides ----------

function intro(f: RecapFacts): Slide {
  const [a, b, c] = f.top;
  const els: El[] = [
    { k: "chips", id: id(), x: 90, y: 150, w: 900, items: ["পুজোর হিসেব ২০২৬"], size: 34, bg: C.marigold, color: C.kajal, enter: "fade", at: 0.1 },
  ];
  if (b) els.push(polaroid(b, 70, 330, 380, -11, { at: 0.35 }));
  if (c) els.push(polaroid(c, 630, 350, 380, 10, { at: 0.5 }));
  if (a) els.push(polaroid(a, 320, 300, 440, -2, { at: 0.7 }));
  els.push(
    { k: "sticker", id: id(), sticker: "s18-lekha-2", x: 790, y: 660, w: 240, rotate: 10, enter: "pop", at: 1.3 },
    { k: "text", id: id(), x: 60, y: 1010, w: 960, text: "এবারের পুজোটা\nকেমন গেল?", size: 128, font: "display", color: C.marigold, lh: 1.12, enter: "words", at: 1.0 },
    {
      k: "text",
      id: id(),
      x: 90,
      y: 1390,
      w: 900,
      text: `${f.pujoDays > 1 ? `${bnNum(f.pujoDays)} দিন, ` : ""}${bnNum(f.stats.total)}টা ছবি।\nফোন কিন্তু সব মনে রেখেছে।`,
      size: 50,
      font: "body",
      color: C.ink,
      lh: 1.45,
      enter: "rise",
      at: 1.7,
    },
  );
  return { id: "intro", bg: C.night, dark: true, motif: "alpona", motifColor: C.marigold, motifAt: [540, 640], motifR: 560, pattern: "none", patternColor: C.marigold, duration: 6, els };
}

function total(f: RecapFacts): Slide {
  const n = f.stats.total;
  const joke =
    n >= 400
      ? "Gallery খুলতে এখন দু মিনিট লাগে, তাই না?"
      : n >= 250
        ? "'Storage full' notification-টা অন্তত দশবার এসেছে।"
        : n >= 120
          ? "প্রতি প্যান্ডেলে নিয়ম করে পাঁচটা। ভালোই।"
          : n >= 50
            ? "বেশ মেপেজুপে। ভিড়ের মধ্যে ফোন বের করাও তো এক ঝামেলা।"
            : "এত কম? ফোনটা পকেট থেকে বেরিয়েছিল তো?";
  const els: El[] = [
    kicker("এবার পুজোয় তুমি তুলেছ", C.paper, 220),
    { k: "sticker", id: id(), sticker: "s14-pandal-6", x: 850, y: 90, w: 190, rotate: 12, enter: "pop", at: 0.5 },
    { k: "count", id: id(), x: 0, y: 330, w: 1080, value: n, size: 320, font: "serif", color: C.paper, lh: 1.1, enter: "pop", at: 0.3 },
    { k: "text", id: id(), x: 0, y: 700, w: 1080, text: "টা ছবি", size: 110, font: "display", color: C.marigold, enter: "rise", at: 0.7 },
    { k: "text", id: id(), x: 110, y: 900, w: 860, text: joke, size: 54, font: "body", weight: 500, color: C.paper, lh: 1.4, enter: "words", at: 1.2 },
  ];
  const strip = f.strip.slice(0, 4);
  const tilt = [-8, 5, -4, 9];
  strip.forEach((p, i) => els.push(polaroid(p, 60 + i * 245, 1250 + (i % 2) * 40, 230, tilt[i], { at: 1.6 + i * 0.12 })));
  return { id: "total", bg: C.sindoor, dark: true, motif: "rays", motifColor: C.paper, motifAt: [540, 560], motifR: 1100, pattern: "none", patternColor: C.paper, duration: 6, els };
}

function days(f: RecapFacts): Slide | null {
  const b = f.stats.busiestDay;
  if (!b || f.days.length < 2) return null;
  const els: El[] = [
    kicker("কোন দিন কটা", C.sindoor, 200),
    { k: "sticker", id: id(), sticker: "s16-bonedi-bari-2", x: 790, y: 520, w: fit("s16-bonedi-bari-2", 140, 190).w, rotate: 8, enter: "pop", at: 1.2 },
    { k: "text", id: id(), x: 60, y: 290, w: 960, text: `${dayIn(b.label, b.day)} সবচেয়ে বেশি`, size: 112, font: "display", color: C.sindoor, lh: 1.15, enter: "words", at: 0.3 },
    { k: "chips", id: id(), x: 90, y: 600, w: 900, items: [`${bnNum(b.count)}টা ছবি`], size: 44, bg: C.kajal, color: C.paper, enter: "pop", at: 0.9 },
    {
      k: "bars",
      id: id(),
      x: 80,
      y: 760,
      w: 920,
      h: 620,
      items: f.days.map((d) => ({ label: d.label, value: d.count, hot: d.key === b.day })),
      color: C.marigold,
      hot: C.sindoor,
      ink: C.kajal,
      at: 1.1,
    },
  ];
  const punch = DAY_PUNCH[b.day];
  if (punch) els.push({ k: "text", id: id(), x: 110, y: 1450, w: 860, text: punch, size: 48, font: "body", weight: 500, color: C.kajal2, lh: 1.4, enter: "rise", at: 2.0 });
  return { id: "days", bg: C.paper, dark: false, motif: "alpona", motifColor: C.sindoor, motifAt: [1000, 1760], motifR: 380, pattern: "dots", patternColor: C.kajal, duration: 6.5, els };
}

function versus(f: RecapFacts): Slide | null {
  const s = f.stats;
  if (s.total < 8 || (!f.thakurPhoto && !f.peoplePhoto)) return null;
  const verdict =
    s.people > 2 * s.thakur
      ? "ঠাকুর দেখতে গিয়েছিলে, না নিজেকে দেখাতে?"
      : s.people > s.thakur
        ? "সেলফি জিতেছে, তবে অল্পের জন্য।"
        : "সব ছবিতে শুধু প্রতিমা। নিজের একটা তুলতে পারতে!";
  const els: El[] = [kicker("ঠাকুর vs তুমি", C.marigold, 190)];
  if (f.thakurPhoto) els.push(polaroid(f.thakurPhoto, 100, 310, 410, -7, { caption: "ঠাকুর", enter: "slide", at: 0.3 }));
  if (f.peoplePhoto) els.push(polaroid(f.peoplePhoto, 570, 340, 410, 7, { caption: "তোমরা", enter: "slide", at: 0.45 }));
  els.push(
    { k: "chips", id: id(), x: 90, y: 560, w: 900, items: ["vs"], size: 44, bg: C.sindoor, color: C.paper, enter: "stamp", at: 1.0 },
    { k: "count", id: id(), x: 80, y: 880, w: 450, value: s.thakur, size: 170, font: "serif", color: C.marigold, enter: "pop", at: 1.2 },
    { k: "count", id: id(), x: 550, y: 880, w: 450, value: s.people, size: 170, font: "serif", color: C.paper, enter: "pop", at: 1.35 },
    { k: "text", id: id(), x: 80, y: 1100, w: 450, text: "ঠাকুরের ছবি", size: 40, font: "body", color: C.muted, enter: "fade", at: 1.5 },
    { k: "text", id: id(), x: 550, y: 1100, w: 450, text: "নিজেদের ছবি", size: 40, font: "body", color: C.muted, enter: "fade", at: 1.5 },
    { k: "text", id: id(), x: 90, y: 1260, w: 900, text: verdict, size: 76, font: "display", color: C.marigold, lh: 1.25, enter: "words", at: 1.9 },
    { k: "sticker", id: id(), sticker: "s04-shajgoj-9", x: 860, y: 1560, w: 150, rotate: 14, enter: "pop", at: 2.4 },
  );
  return { id: "versus", bg: C.night2, dark: true, motif: "rings", motifColor: C.marigold, motifAt: [540, 620], motifR: 720, pattern: "none", patternColor: C.marigold, duration: 6.5, els };
}

function group(f: RecapFacts): Slide | null {
  const g = f.group;
  const big = f.stats.biggestGroup;
  if (!g || !big || big.count < 3) return null;
  // Show the whole photo, so every ringed face is in it.
  let w = 880;
  let h = polaroidHeightFor(g, w, false);
  if (h > 860) {
    w = Math.round(w * (860 / h));
    h = polaroidHeightFor(g, w, false);
  }
  const top = 290;
  const x = (1080 - w) / 2;
  const after = top + h + 70;
  const eyes =
    big.eyesClosed === 0
      ? "আর কারও চোখ বন্ধ নেই! এটা বাঁধিয়ে রাখো।"
      : big.eyesClosed === 1
        ? "একজনের চোখ বন্ধ। প্রতিবার ওই একজনই, তাই না?"
        : `${bnNum(big.eyesClosed)} জনের চোখ বন্ধ। 'আরেকটা তোল' বলার কেউ ছিল না?`;
  const els: El[] = [
    kicker("সবচেয়ে বড় গ্রুপ ছবি", C.sindoor, 190),
    { k: "photo", id: id(), photo: g, x, y: top, w, h, frame: "polaroid", rotate: -2, faces: true, enter: "drop", at: 0.3 },
    { k: "text", id: id(), x: 60, y: after, w: 960, text: `${bnNum(big.count)} জন এক ফ্রেমে`, size: 118, font: "display", color: C.sindoor, enter: "words", at: 1.4 },
    { k: "text", id: id(), x: 110, y: after + 170, w: 860, text: eyes, size: 48, font: "body", weight: 500, color: C.kajal, lh: 1.4, enter: "rise", at: 2.0 },
    { k: "sticker", id: id(), sticker: "s14-pandal-4", x: 40, y: 110, w: 150, rotate: -10, enter: "pop", at: 0.9 },
  ];
  return { id: "group", bg: C.cream, dark: false, motif: "alpona", motifColor: C.sindoor, motifAt: [540, 760], motifR: 640, pattern: "none", patternColor: C.sindoor, duration: 7, els };
}

function burst(f: RecapFacts): Slide | null {
  const n = f.stats.biggestBurst;
  if (n < 3 || f.burst.length < 2) return null;
  const [keep, ...rest] = f.burst;
  const backs: Array<[number, number, number]> = [
    [200, 380, -14],
    [400, 400, 12],
    [300, 350, -5],
  ];
  const els: El[] = [kicker("এক পোজে কতবার?", C.kajal, 190)];
  rest.slice(0, 3).forEach((p, i) => els.push(polaroid(p, backs[i][0], backs[i][1], 480, backs[i][2], { at: 0.3 + i * 0.12 })));
  els.push(polaroid(keep, 300, 430, 480, 0, { stamp: "এটাই রাখলাম", at: 0.8 }));
  els.push(
    { k: "text", id: id(), x: 60, y: 1080, w: 960, text: `একই পোজে ${bnNum(n)}টা ছবি`, size: 104, font: "display", color: C.kajal, lh: 1.15, enter: "words", at: 1.5 },
    { k: "text", id: id(), x: 110, y: 1250, w: 860, text: `${bnNum(n)}টার মধ্যে ভালো এসেছে একটাই। সেটা রাখলাম, বাকিগুলোর কথা কেউ জানবে না।`, size: 48, font: "body", weight: 500, color: C.kajal, lh: 1.4, enter: "rise", at: 2.0 },
  );
  const dup = f.stats.duplicates;
  const blur = f.stats.blurry;
  if (dup + blur > 0)
    els.push({
      k: "chips",
      id: id(),
      x: 60,
      y: 1520,
      w: 960,
      items: [dup ? `${bnNum(dup)}টা ডুপ্লিকেট বাদ` : "", blur ? `${bnNum(blur)}টা ঝাপসা বাদ` : ""].filter(Boolean),
      size: 34,
      bg: C.kajal,
      color: C.marigold,
      enter: "fade",
      at: 2.5,
    });
  return { id: "burst", bg: C.mari, dark: false, motif: "rays", motifColor: C.kajal, motifAt: [540, 680], motifR: 1000, pattern: "none", patternColor: C.kajal, duration: 7, els };
}

function lateNight(f: RecapFacts): Slide | null {
  const last = f.stats.latest;
  if (!last || !f.latest) return null;
  const h = last.getHours();
  const joke =
    h < 5
      ? "ঘুম? সেটা আবার কী?"
      : h >= 22
        ? "এত রাতেও ক্যামেরা চালু। বাড়ি থেকে কটা ফোন এসেছিল?"
        : "এরপর আর একটাও ছবি নেই। তাড়াতাড়ি বাড়ি ফিরেছিলে, মা খুশি।";
  const els: El[] = [
    kicker("সবচেয়ে late-night ছবি", C.marigold, 190),
    { k: "text", id: id(), x: 0, y: 330, w: 1080, text: timeOf(last), size: 300, font: "serif", color: C.marigold, lh: 1.1, enter: "pop", at: 0.3 },
    { k: "text", id: id(), x: 0, y: 680, w: 1080, text: bnDayPart(last), size: 100, font: "display", color: C.ink, enter: "rise", at: 0.7 },
    polaroid(f.latest, 330, 870, 420, -5, { caption: dayLabel(f.latest.day) ?? undefined, at: 1.0 }),
    { k: "text", id: id(), x: 90, y: 1430, w: 900, text: joke, size: 80, font: "display", color: C.ink, lh: 1.25, enter: "words", at: 1.7 },
    { k: "sticker", id: id(), sticker: "s16-bonedi-bari-6", x: 110, y: 960, w: 170, rotate: -8, enter: "pop", at: 1.5 },
  ];
  return { id: "night", bg: C.midnight, dark: true, motif: "moon", motifColor: C.marigold, motifAt: [880, 300], motifR: 110, pattern: "none", patternColor: C.marigold, duration: 6, els };
}

function walked(f: RecapFacts): Slide | null {
  const km = f.stats.km;
  if (!km || !f.route) return null;
  const joke =
    km >= 20 ? "পায়ের ব্যথাটা এবার বুঝলে তো?" : km >= 5 ? "এক প্যান্ডেল থেকে আরেক প্যান্ডেল, সারা রাত।" : "পাড়ার প্যান্ডেল ছেড়ে বেশি দূর যাওনি দেখছি।";
  const els: El[] = [
    kicker("Pandal hopping", C.paper, 200),
    { k: "count", id: id(), x: 0, y: 290, w: 1080, value: km, decimals: km < 10 ? 1 : 0, size: 280, font: "serif", color: C.paper, lh: 1.1, enter: "pop", at: 0.3 },
    { k: "text", id: id(), x: 0, y: 620, w: 1080, text: "কিলোমিটার ঘুরেছ", size: 90, font: "display", color: C.marigold, enter: "rise", at: 0.7 },
    { k: "box", id: id(), x: 140, y: 800, w: 800, h: 600, fill: C.deeper, radius: 44, enter: "fade", at: 0.9 },
    { k: "route", id: id(), x: 190, y: 850, w: 700, h: 500, points: f.route, color: C.marigold, dot: C.paper, at: 1.1 },
    { k: "text", id: id(), x: 110, y: 1470, w: 860, text: joke, size: 52, font: "body", weight: 500, color: C.paper, lh: 1.4, enter: "rise", at: 2.6 },
    { k: "sticker", id: id(), sticker: "s04-shajgoj-8", x: 830, y: 1290, w: 200, rotate: 10, enter: "pop", at: 2.4 },
  ];
  return { id: "walk", bg: C.sindoor, dark: true, motif: "none", motifColor: C.paper, motifAt: [540, 960], motifR: 0, pattern: "border", patternColor: C.deep, duration: 6.5, els };
}

function best(f: RecapFacts): Slide | null {
  const cover = f.top[0];
  if (!cover) return null;
  const els: El[] = [
    kicker("এবারের সেরা ছবি", C.marigold, 190),
    polaroid(cover, 210, 290, 660, -3, { caption: caption(cover), enter: "pop", at: 0.3 }),
    { k: "sticker", id: id(), sticker: "s13-thakurer-shaj-5", x: 790, y: 230, w: 190, rotate: 14, enter: "pop", at: 1.1 },
    { k: "text", id: id(), x: 90, y: 1150, w: 900, text: "এটাই এবারের DP।", size: 110, font: "display", color: C.marigold, lh: 1.2, enter: "words", at: 1.2 },
    { k: "text", id: id(), x: 110, y: 1400, w: 860, text: `${bnNum(f.stats.total)}টার মধ্যে এটাই সেরা। এ নিয়ে তর্ক চলবে না।`, size: 48, font: "body", color: C.muted, lh: 1.4, enter: "rise", at: 1.9 },
  ];
  return { id: "best", bg: C.night, dark: true, motif: "rays", motifColor: C.marigold, motifAt: [540, 680], motifR: 1000, pattern: "none", patternColor: C.marigold, duration: 6, els };
}

function personality(f: RecapFacts, p: Persona): Slide {
  const s = f.stats;
  const traits = [
    `${bnNum(s.total)}টা ছবি`,
    s.busiestDay ? `${s.busiestDay.label} সেরা` : "",
    s.biggestGroup && s.biggestGroup.count >= 3 ? `${bnNum(s.biggestGroup.count)} জনের গ্রুপ` : "",
    s.km ? `${bnKm(s.km)} কিমি` : "",
  ].filter(Boolean);
  const emblem = fit(p.sticker, 380, 440);
  const els: El[] = [
    kicker("তোমার পুজো personality", C.sindoor, 210),
    { k: "sticker", id: id(), sticker: p.sticker, x: 540 - emblem.w / 2, y: 820 - emblem.h, w: emblem.w, rotate: -4, enter: "pop", at: 0.4 },
    { k: "text", id: id(), x: 60, y: 880, w: 960, text: p.title, size: 128, font: "display", color: C.sindoor, lh: 1.12, enter: "words", at: 1.0 },
    { k: "text", id: id(), x: 110, y: 1180, w: 860, text: p.line, size: 48, font: "body", weight: 500, color: C.kajal, lh: 1.45, enter: "rise", at: 1.7 },
    { k: "chips", id: id(), x: 90, y: 1500, w: 900, items: traits.slice(0, 3), size: 36, bg: C.kajal, color: C.paper, enter: "pop", at: 2.4 },
  ];
  return { id: "persona", bg: C.paper, dark: false, motif: "alpona", motifColor: C.sindoor, motifAt: [540, 540], motifR: 420, pattern: "border", patternColor: C.sindoor, duration: 7, els };
}

function outro(f: RecapFacts, p: Persona): Slide {
  const s = f.stats;
  const [a, b, c] = f.top;
  const els: El[] = [
    { k: "chips", id: id(), x: 90, y: 120, w: 900, items: ["পুজোর হিসেব ২০২৬"], size: 34, bg: C.marigold, color: C.kajal, enter: "fade", at: 0.1 },
  ];
  if (b) els.push(polaroid(b, 120, 270, 300, -9, { at: 0.2 }));
  if (c) els.push(polaroid(c, 660, 280, 300, 8, { at: 0.3 }));
  if (a) els.push(polaroid(a, 380, 240, 320, -1, { at: 0.45 }));
  const cells: Array<[string, string]> = [
    ["মোট ছবি", `${bnNum(s.total)}টা`],
    s.busiestDay ? ["সেরা দিন", s.busiestDay.label] : ["বাদ গেল", `${bnNum(s.duplicates + s.blurry)}টা`],
    ["Personality", p.short],
    ["শেষ ছবি", s.latest ? `${bnDayPart(s.latest)} ${timeOf(s.latest)}` : "জানা নেই"],
  ];
  cells.forEach(([label, value], i) => {
    const x = i % 2 ? 560 : 100;
    const y = 740 + Math.floor(i / 2) * 230;
    els.push(
      { k: "box", id: id(), x, y, w: 420, h: 200, fill: C.deeper, radius: 30, enter: "rise", at: 0.9 + i * 0.12 },
      { k: "text", id: id(), x: x + 30, y: y + 26, w: 360, text: label, size: 34, font: "body", color: C.muted, align: "left", enter: "rise", at: 1.0 + i * 0.12 },
      { k: "text", id: id(), x: x + 30, y: y + 80, w: 360, text: value, size: 62, font: "display", color: C.marigold, align: "left", enter: "rise", at: 1.05 + i * 0.12 },
    );
  });
  els.push(
    { k: "sticker", id: id(), sticker: "s18-lekha-4", x: 540 - fit("s18-lekha-4", 520, 380).w / 2, y: 1230, w: fit("s18-lekha-4", 520, 380).w, rotate: -3, enter: "pop", at: 1.8 },
    { k: "text", id: id(), x: 90, y: 1665, w: 900, text: `তোমারটা বানাও: ${SITE.link}`, size: 32, font: "body", color: C.muted, enter: "fade", at: 2.4 },
  );
  return { id: "outro", bg: C.deep, dark: true, motif: "none", motifColor: C.marigold, motifAt: [540, 960], motifR: 0, pattern: "border", patternColor: C.deeper, duration: 9, els };
}

// Optional slides in order of how good a story they tell; at most five of
// them, so the deck stays at ten.
export function buildRecap(f: RecapFacts): Slide[] {
  uid = 0;
  const p = persona(f);
  const optional: Array<[number, Slide | null]> = [
    [1, group(f)],
    [2, lateNight(f)],
    [3, burst(f)],
    [4, versus(f)],
    [5, days(f)],
    [6, walked(f)],
  ];
  const keep = new Set(
    optional
      .filter(([, s]) => s)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 5)
      .map(([, s]) => s!.id),
  );
  const pick = (s: Slide | null) => (s && keep.has(s.id) ? [s] : []);
  const [g, n, b, v, d, w] = optional.map(([, s]) => s);
  const top = best(f);
  return [intro(f), total(f), ...pick(d), ...pick(v), ...pick(g), ...pick(b), ...pick(n), ...pick(w), ...(top ? [top] : []), personality(f, p), outro(f, p)];
}
