// Pujo stickers: transparent WebP cut-outs in public/stickers. w and h are the
// files' real pixel sizes (keeps the aspect ratio right before the image loads).
// The first eight are hand-picked; the rest come from `npm run stickers`
// (scripts/build-stickers.mjs), which cuts sheets in moodboard/stickers.
import generated from "./stickers.generated.json";
import type { StickerItem } from "./types";

export type StickerDef = {
  id: string;
  name: string;
  src: string;
  w: number;
  h: number;
  group?: string;
};

export const STICKER_GROUP_DEFAULT = "পুজোর জিনিস";

const BUILT_IN: StickerDef[] = [
  { id: "dhak", name: "ঢাক", src: "/stickers/dhak.webp", w: 640, h: 610 },
  { id: "shankh", name: "শাঁখ", src: "/stickers/shankh.webp", w: 640, h: 574 },
  { id: "joba", name: "জবা ফুল", src: "/stickers/joba.webp", w: 640, h: 596 },
  { id: "dhunuchi", name: "ধুনুচি", src: "/stickers/dhunuchi.webp", w: 331, h: 640 },
  { id: "prodip", name: "প্রদীপ", src: "/stickers/prodip.webp", w: 602, h: 606 },
  { id: "durga_eyes", name: "মায়ের চোখ", src: "/stickers/durga_eyes.webp", w: 640, h: 579 },
  { id: "radio", name: "মহালয়ার রেডিও", src: "/stickers/radio.webp", w: 640, h: 579 },
  { id: "jhumka", name: "ঝুমকো", src: "/stickers/jhumka.webp", w: 640, h: 565 },
];

export const STICKERS: StickerDef[] = [...BUILT_IN, ...(generated as StickerDef[])];

// Stickers by group, in first-seen order, for the panel.
export function stickerGroups(): Array<[string, StickerDef[]]> {
  const groups = new Map<string, StickerDef[]>();
  for (const st of STICKERS) {
    const g = st.group ?? STICKER_GROUP_DEFAULT;
    groups.set(g, [...(groups.get(g) ?? []), st]);
  }
  return [...groups.entries()];
}

const stickerMap = new Map<string, StickerDef>(STICKERS.map((s) => [s.id, s]));

export function stickerById(id: string): StickerDef | undefined {
  return stickerMap.get(id);
}

export function stickerBox(item: StickerItem): { w: number; h: number } {
  const def = stickerById(item.kind);
  const ratio = def && def.w > 0 ? def.h / def.w : 1;
  const w = item.size || 240;
  const h = Math.round(w * ratio);
  return { w, h };
}

const imageCache = new Map<string, HTMLImageElement>();

export function getStickerImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function drawSticker(ctx: CanvasRenderingContext2D, item: StickerItem) {
  const def = stickerById(item.kind);
  if (!def) return;
  const { w, h } = stickerBox(item);
  let img = imageCache.get(def.src);
  if (!img) {
    img = new Image();
    img.src = def.src;
    imageCache.set(def.src, img);
  }
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate((item.rotate * Math.PI) / 180);
  if (item.flip) ctx.scale(-1, 1);
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}
