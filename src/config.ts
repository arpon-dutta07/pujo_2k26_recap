// Everything a non-coder might want to change lives here.

export const SITE = {
  name: "পুজোর ঝুলি",
  // The site's address (not printed on the pictures).
  link: "pujor-jhuli.vercel.app",
  // Every copied caption ends with this Instagram handle, so posts tag the page.
  instagram: "lyadkhor.coder",
  // Hashtags under every copied caption. #pujorjhuli finds every post made here.
  hashtags: "#durgapuja2026 #pujorjhuli #kolkata",
};

export type DayKey = "panchami" | "shashthi" | "saptami" | "ashtami" | "navami" | "dashami";

export type PujoDay = { key: DayKey; bn: string; date: string };

// Durga Puja 2026 (Bengal calendar). Double-check against a panjika before launch:
// a tithi that spans two dates can move a day by one.
export const PUJO_YEAR = 2026;
export const PUJO_DAYS: PujoDay[] = [
  { key: "panchami", bn: "পঞ্চমী", date: "2026-10-16" },
  { key: "shashthi", bn: "ষষ্ঠী", date: "2026-10-17" },
  { key: "saptami", bn: "সপ্তমী", date: "2026-10-18" },
  { key: "ashtami", bn: "অষ্টমী", date: "2026-10-19" },
  { key: "navami", bn: "নবমী", date: "2026-10-20" },
  { key: "dashami", bn: "দশমী", date: "2026-10-21" },
];

// Pandal hopping runs past midnight: a 2 am photo still belongs to the night before.
export const DAY_STARTS_AT_HOUR = 5;

export const LIMITS = {
  // Photos added in one go.
  maxPhotos: 40,
  // Width the photo is decoded at to learn its shape.
  decodeSize: 640,
  thumbSize: 360,
};

export const EXPORT = {
  slide: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  jpegQuality: 0.92,
};
