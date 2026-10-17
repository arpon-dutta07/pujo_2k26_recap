import { DAY_STARTS_AT_HOUR, PUJO_DAYS, type DayKey } from "../config";
import type { Photo } from "./types";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 21;

export function pujoDayOf(date: Date | null): Photo["day"] {
  if (!date) return null;
  const shifted = new Date(date.getTime() - DAY_STARTS_AT_HOUR * 3_600_000);
  const key = ymd(shifted);
  const hit = PUJO_DAYS.find((d) => d.date === key);
  if (hit) return hit.key;
  const first = new Date(`${PUJO_DAYS[0].date}T00:00:00`).getTime();
  const last = new Date(`${PUJO_DAYS[PUJO_DAYS.length - 1].date}T23:59:59`).getTime();
  const t = shifted.getTime();
  if (t < first && first - t < WINDOW_DAYS * DAY_MS) return "before";
  if (t > last && t - last < WINDOW_DAYS * DAY_MS) return "after";
  return null;
}

export const DAY_ORDER: Array<NonNullable<Photo["day"]> | "unknown"> = [
  "before",
  ...PUJO_DAYS.map((d) => d.key),
  "after",
  "unknown",
];

export function dayLabel(day: Photo["day"]): string | null {
  if (!day) return null;
  if (day === "before") return "পুজোর আগে";
  if (day === "after") return "দশমীর পরে";
  return PUJO_DAYS.find((d) => d.key === (day as DayKey))?.bn ?? null;
}
