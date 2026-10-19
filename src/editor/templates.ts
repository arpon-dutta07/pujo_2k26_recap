// Moodboard templates: pictures with see-through photo windows, made from
// moodboard/originals by `npm run templates` (scripts/build-templates.mjs).
// The script measures each window, including tilted ones; photos go under
// the picture, so whatever overlaps a frame in the art stays on top.
import generatedTemplates from "./templates.generated.json";
import type { Format, SlotDef, TemplateDef, TemplateLayout } from "./types";

export type GeneratedTemplateEntry = {
  id: string;
  name: string;
  format: Format;
  src: string;
  thumb?: string;
  w: number;
  h: number;
  slots: Array<Omit<SlotDef, "shape" | "radius">>;
};

// Each one was checked against its debug sheet in moodboard/debug (window
// count, cut edges, tilt). Add "<id>__<format>" here after checking a new one.
const VERIFIED = new Set([
  "agomoni__story",
  "durga-memory__story",
  "photo-strip__story",
  "golden-puja__story",
  "durga-scrapbook__story",
  "vintage-memory__story",
  "sharodiya-kolkata__story",
  "pujo-collage__story",
  "mayer-anchol__story",
  "mahishasuramardini__story",
  "laal-sada-polaroid__story",
  "pujabarshiki__story",
  "pujor-kenakata__story",
  "bijoya__story",
  "pujor-adda__story",
  "chhotobelar-pujo__story",
  "chhotobelar-mela__story",
  "ghater-sondhya__story",
  "nabamir-raat__story",
  "theme-pandal__story",
  "retro-cinema__story",
  "pujor-khobor__story",
  "padma__story",
  "shiuli-char__story",
  "alpona-tin__story",
  "khilan__story",
  "tin-khilan__story",
  "ghontar-khilan__story",
]);

const entries = (generatedTemplates as unknown as GeneratedTemplateEntry[]).filter((e) => VERIFIED.has(`${e.id}__${e.format}`));

// One template id can have a post and a story picture.
const byId = new Map<string, { id: string; name: string } & Partial<Record<Format, GeneratedTemplateEntry>>>();
for (const e of entries) {
  const g = byId.get(e.id) ?? { id: e.id, name: e.name };
  g[e.format] = e;
  byId.set(e.id, g);
}

export const TEMPLATES: TemplateDef[] = Array.from(byId.values()).map((g) => ({
  id: g.id,
  name: g.name,
  span: 1,
  overlaySrc: { post: g.post?.src, story: g.story?.src },
  thumbSrc: { post: g.post?.thumb, story: g.story?.thumb },
  layout: (W: number, H: number): TemplateLayout => {
    const target = H / W > 1.5 ? g.story ?? g.post : g.post ?? g.story;
    if (!target) return { slots: [] };
    const kx = W / target.w;
    const ky = H / target.h;
    return {
      slots: target.slots.map((s) => ({
        ...s,
        x: Math.round(s.x * kx),
        y: Math.round(s.y * ky),
        w: Math.round(s.w * kx),
        h: Math.round(s.h * ky),
        clip: s.clip?.map(([x, y]) => [x * kx, y * ky] as [number, number]),
      })),
    };
  },
}));

// Formats that have at least one live template, and the one to start in.
export const availableFormats = (): Format[] => (["post", "story"] as Format[]).filter((f) => entries.some((e) => e.format === f));
export const defaultFormat = (): Format => (availableFormats().includes("post") ? "post" : "story");
export const templatesFor = (format: Format) => TEMPLATES.filter((t) => entries.some((e) => e.id === t.id && e.format === format));

const EMPTY: TemplateDef = { id: "empty", name: "", span: 1, layout: () => ({ slots: [] }) };

export function templateById(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0] ?? EMPTY;
}
