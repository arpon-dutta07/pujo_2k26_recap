// One recap slide, written once and drawn twice: animated on the page
// (SlideView.tsx) and as a 1080x1920 JPEG for sharing (paint.ts). Every
// position and size is in those 1080x1920 slide units.
import type { Photo } from "../lib/types";

export const SLIDE_W = 1080;
export const SLIDE_H = 1920;

export type Font = "display" | "serif" | "body";

// How an element comes in on the page. The shared image shows the end state.
export type Enter = "rise" | "pop" | "drop" | "fade" | "stamp" | "words" | "slide" | "none";

type Base = {
  id: string;
  x: number;
  y: number;
  at?: number; // seconds after the slide starts
  enter?: Enter;
  rotate?: number; // degrees
};

export type TextEl = Base & {
  k: "text";
  w: number;
  text: string;
  size: number;
  font: Font;
  weight?: number;
  color: string;
  align?: "left" | "center" | "right";
  lh?: number;
};

// A number that rolls up from zero.
export type CountEl = Omit<TextEl, "k" | "text"> & { k: "count"; value: number; prefix?: string; suffix?: string; decimals?: number };

export type PhotoEl = Base & {
  k: "photo";
  w: number;
  h: number; // the whole frame, border included
  photo: Photo;
  frame: "polaroid" | "plain";
  caption?: string;
  faces?: boolean; // ring every face the model found
  blur?: boolean;
  stamp?: string;
};

export type StickerEl = Base & { k: "sticker"; w: number; sticker: string };

// One or more pills in a row, centred in the box (or from its left edge).
export type ChipsEl = Base & {
  k: "chips";
  w: number;
  items: string[];
  size: number;
  bg: string;
  color: string;
  align?: "left" | "center";
};

export type BarsEl = Base & {
  k: "bars";
  w: number;
  h: number;
  items: Array<{ label: string; value: number; hot?: boolean }>;
  color: string;
  hot: string;
  ink: string;
};

// A walk drawn from the photos' GPS points (0..1 inside the box).
export type RouteEl = Base & { k: "route"; w: number; h: number; points: Array<[number, number]>; color: string; dot: string };

export type BoxEl = Base & { k: "box"; w: number; h: number; fill: string; radius: number; stroke?: string };

export type El = TextEl | CountEl | PhotoEl | StickerEl | ChipsEl | BarsEl | RouteEl | BoxEl;

export type Motif = "alpona" | "rays" | "rings" | "moon" | "none";
export type Pattern = "dots" | "border" | "none";

export type Slide = {
  id: string;
  bg: string;
  dark: boolean; // light chrome (progress bars, buttons) on top
  motif: Motif;
  motifColor: string;
  motifAt: [number, number];
  motifR: number;
  pattern: Pattern;
  patternColor: string;
  duration: number; // seconds
  els: El[];
};
