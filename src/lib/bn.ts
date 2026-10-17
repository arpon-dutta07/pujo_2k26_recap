// Bengali numerals, times and dates.

const DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export const bnNum = (n: number | string): string =>
  String(n).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);

const MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

export const bnDate = (d: Date): string => `${bnNum(d.getDate())} ${MONTHS[d.getMonth()]}`;

// The part of the day the way people say it in Bangla.
export const bnDayPart = (d: Date): string => {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 6) return "ভোর";
  if (h >= 6 && h < 12) return "সকাল";
  if (h >= 12 && h < 15) return "দুপুর";
  if (h >= 15 && h < 17.5) return "বিকেল";
  if (h >= 17.5 && h < 19.5) return "সন্ধে";
  return "রাত";
};

export const bnTime = (d: Date): string => {
  const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${bnDayPart(d)} ${bnNum(h12)}:${bnNum(mm)}`;
};

export const bnKm = (km: number): string => bnNum(km < 10 ? km.toFixed(1) : Math.round(km));
