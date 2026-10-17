// Image-backed templates loaded from templates.generated.json.
// All code-drawn templates have been removed per ANTIGRAVITY.md.
import generatedTemplates from "./templates.generated.json";
import type { Format, TemplateDef, TemplateLayout } from "./types";

export type GeneratedTemplateEntry = {
  id: string;
  name: string;
  format: Format;
  src: string;
  w: number;
  h: number;
  slots: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    role?: "hero" | "people" | "thakur" | "any";
  }>;
};

// Only templates whose photo windows have been checked against the debug
// image go live. Add "<id>__<format>" here after checking a new one.
const VERIFIED = new Set(["agomoni__story"]);

const entries = ((generatedTemplates as unknown as GeneratedTemplateEntry[]) || []).filter((e) =>
  VERIFIED.has(`${e.id}__${e.format}`),
);

// Group by id so a template knows both its post and story variants
const templateMap = new Map<string, {
  id: string;
  name: string;
  post?: GeneratedTemplateEntry;
  story?: GeneratedTemplateEntry;
}>();

for (const e of entries) {
  const existing = templateMap.get(e.id) || { id: e.id, name: e.name };
  if (e.format === "post") existing.post = e;
  if (e.format === "story") existing.story = e;
  templateMap.set(e.id, existing);
}

export const TEMPLATES: TemplateDef[] = Array.from(templateMap.values()).map((g) => {
  return {
    id: g.id,
    name: g.name,
    span: 1,
    overlaySrc: {
      post: g.post?.src,
      story: g.story?.src,
    },
    layout: (W: number, H: number): TemplateLayout => {
      const isStory = H / W > 1.5;
      const target = isStory ? (g.story || g.post) : (g.post || g.story);
      if (!target) return { slots: [] };
      // Slots are normalized to current W and H if aspect ratios match, or scaled directly
      const scaleX = W / target.w;
      const scaleY = H / target.h;
      return {
        slots: target.slots.map((s) => ({
          id: s.id,
          x: Math.round(s.x * scaleX),
          y: Math.round(s.y * scaleY),
          w: Math.round(s.w * scaleX),
          h: Math.round(s.h * scaleY),
          role: s.role,
        })),
      };
    },
  };
});

// Formats that have at least one live template, and the one to start in.
export const availableFormats = (): Format[] =>
  (["post", "story"] as Format[]).filter((f) => entries.some((e) => e.format === f));
export const defaultFormat = (): Format => (availableFormats().includes("post") ? "post" : "story");
export const templatesFor = (format: Format) =>
  TEMPLATES.filter((t) => entries.some((e) => e.id === t.id && e.format === format));

export function templateById(id: string): TemplateDef {
  const found = TEMPLATES.find((t) => t.id === id);
  if (found) return found;
  // Fallback to first available template if missing
  if (TEMPLATES.length > 0) return TEMPLATES[0];
  // Emergency fallback
  return {
    id,
    name: id,
    span: 1,
    layout: (W, H) => ({
      slots: [{ id: "s0", x: 60, y: 60, w: W - 120, h: H - 120, role: "hero" }],
    }),
  };
}
