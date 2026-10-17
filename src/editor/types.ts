// The template studio's data. A project is a list of pages; a page is one
// template (one Instagram slide, or several for a panorama) plus what the
// visitor put on it. Every position is in export pixels (1080 wide per slide).

export type Format = "post" | "story";

export const FORMATS: Record<Format, { w: number; h: number; label: string; short: string }> = {
  post: { w: 1080, h: 1350, label: "পোস্ট", short: "৪:৫" },
  story: { w: 1080, h: 1920, label: "স্টোরি", short: "৯:১৬" },
};

export type FontKey = "display" | "serif" | "body";

export type SlotShape = "rect" | "circle" | "arch";

export type SlotDef = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape?: SlotShape;
  radius?: number;
  rotate?: number; // degrees, around the slot centre
  // The window's real outline in export px: the photo is clipped to it, so it
  // never shows inside a neighbouring window where frames overlap.
  clip?: Array<[number, number]>;
  z?: number; // drawing order: windows on top in the art get a higher z
  // Autofill hint: the biggest slot gets the best photo, round ones like thakur.
  role?: "hero" | "people" | "thakur" | "any";
};

export type TextStyle = "plain" | "shadow" | "paper" | "pill";

export type TextBind = { slot: string; field: "day" | "time" | "date" };

export type TextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number; // font size in export px
  font: FontKey;
  color: string;
  rotate: number;
  align: "left" | "center" | "right";
  style: TextStyle;
  // Filled in from the photo in that slot (its Pujo day, time or date).
  bind?: TextBind;
  fromTemplate?: boolean;
};

export type StickerItem = {
  id: string;
  kind: string;
  x: number; // centre
  y: number;
  size: number; // width in export px
  rotate: number;
  flip?: boolean;
  fromTemplate?: boolean;
};

export type TemplateLayout = {
  slots: SlotDef[];
  texts?: Array<Omit<TextItem, "id" | "rotate" | "align" | "style"> & Partial<Pick<TextItem, "rotate" | "align" | "style">>>;
  stickers?: Array<Omit<StickerItem, "id" | "rotate"> & { rotate?: number }>;
};

export type Painter = (ctx: CanvasRenderingContext2D, W: number, H: number) => void;

export type TemplateDef = {
  id: string;
  name: string;
  span?: number; // slides wide; > 1 is a seamless panorama
  format?: Format;
  src?: string;
  overlaySrc?: Partial<Record<Format, string>>;
  thumbSrc?: Partial<Record<Format, string>>;
  layout: (W: number, H: number) => TemplateLayout;
  paint?: Painter; // under the photos
  over?: Painter; // above the photos (frame edges, lace)
};

// Where a photo sits inside its slot: zoom 1 = just covers the slot,
// (cx, cy) = the point of the photo (0..1) that sits at the slot centre.
export type Fill = { photoId: string; zoom: number; cx: number; cy: number };

export type Page = {
  id: string;
  template: string;
  fills: Record<string, Fill | null>;
  stickers: StickerItem[];
  texts: TextItem[];
};

export type Project = { format: Format; pages: Page[] };

let counter = 0;
export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;
