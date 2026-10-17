// Every template: where the photos go, its default words and stickers, and the
// art drawn under and over the photos. Layouts are functions of the canvas
// size, so each template works as a 4:5 post and as a 9:16 story.
import { alpona, paperGrain, sareeBorder, THEMES } from "../lib/render/draw";
import { alponaArch, dotRing, fill, grain, mottle, ring, ropeFrame, vignette, vineBorder } from "./paint";
import type { TemplateDef, TemplateLayout } from "./types";

const story = (H: number) => H / 1080 > 1.5;

// ---------- লাল পাড় / প্যান্ডেলের রাত: the original carousel frames ----------

function sareeTemplate(id: "lalpar" | "raat"): TemplateDef {
  const t = THEMES[id];
  const slot = (W: number, H: number) => ({ x: 84, y: 84, w: W - 168, h: H - 338, radius: 10 });
  return {
    id,
    name: t.name,
    layout: (W, H) => ({
      slots: [{ id: "a", ...slot(W, H), role: "hero" }],
      texts: [
        { text: "পুজো", bind: { slot: "a", field: "day" }, x: 88, y: H - 146, size: 86, font: "display", color: t.accent, align: "left" },
        { text: "", bind: { slot: "a", field: "time" }, x: W - 84, y: H - 166, size: 40, font: "body", color: t.text, align: "right" },
        { text: "", bind: { slot: "a", field: "date" }, x: W - 84, y: H - 116, size: 34, font: "body", color: t.sub, align: "right" },
      ],
    }),
    paint: (ctx, W, H) => {
      fill(ctx, t.paper, 0, 0, W, H);
      paperGrain(ctx, W, H, t.grain, id === "lalpar" ? 21 : 22);
      sareeBorder(ctx, W, H, t);
      const s = slot(W, H);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.w, s.h, s.radius);
      ctx.fillStyle = id === "lalpar" ? "#e7d8bd" : "#2a140c";
      ctx.fill();
      ctx.restore();
    },
    over: (ctx, W, H) => {
      const s = slot(W, H);
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.w, s.h, s.radius);
      ctx.stroke();
    },
  };
}

// ---------- আলপনা আর্চ: a temple doorway of alpona petals ----------

const ARCH = { band: "#b3121b", petal: "#b3121b", line: "#fff6e6" };

const archTemplate: TemplateDef = {
  id: "arch",
  name: "আলপনা আর্চ",
  layout: (W, H) => {
    const tall = story(H);
    const w = tall ? 760 : 640;
    const slot = { id: "a", x: (W - w) / 2, y: tall ? 300 : 150, w, h: tall ? 1180 : 860, shape: "arch" as const, role: "hero" as const };
    return {
      slots: [slot],
      texts: [
        { text: "শুভ শারদীয়া", x: W / 2, y: tall ? 1660 : 1158, size: tall ? 124 : 100, font: "display", color: "#a3131b" },
        { text: "পুজো ২০২৬", x: W / 2, y: tall ? 1772 : 1262, size: tall ? 46 : 40, font: "body", color: "#7a3a1c" },
      ],
    };
  },
  paint: (ctx, W, H) => {
    fill(ctx, "#fbf0dc", 0, 0, W, H);
    mottle(ctx, 0, 0, W, H, "rgba(255,255,255,0.5)", "rgba(200,140,70,0.10)", 31, 0.8);
    grain(ctx, 0, 0, W, H, "rgba(140,80,30,0.06)", 32);
    const tall = story(H);
    const r = tall ? 70 : 58;
    for (const [x, y] of [
      [r + 20, r + 20],
      [W - r - 20, r + 20],
      [r + 20, H - r - 20],
      [W - r - 20, H - r - 20],
    ]) {
      ctx.globalAlpha = 0.5;
      alpona(ctx, x, y, r, "#b3121b", 8);
      ctx.globalAlpha = 1;
    }
    const s = archTemplate.layout(W, H).slots[0];
    alponaArch(ctx, s.x, s.y, s.w, s.h, 1, ARCH, "petals");
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + s.h);
    ctx.lineTo(s.x, s.y + s.w / 2);
    ctx.arc(s.x + s.w / 2, s.y + s.w / 2, s.w / 2, Math.PI, 0);
    ctx.lineTo(s.x + s.w, s.y + s.h);
    ctx.closePath();
    ctx.fillStyle = "#ffb703";
    ctx.fill();
  },
  over: (ctx, W, H) => {
    const s = archTemplate.layout(W, H).slots[0];
    alponaArch(ctx, s.x, s.y, s.w, s.h, 1, ARCH, "band");
  },
};

// ---------- শোলার ফ্রেম: red ground, white folk vines ----------

const sholaWindow = (W: number, H: number) =>
  story(H) ? { x: 150, y: 170, w: W - 300, h: H - 340, r: 60 } : { x: 150, y: 150, w: W - 300, h: H - 300, r: 54 };

const sholaTemplate: TemplateDef = {
  id: "shola",
  name: "শোলার ফ্রেম",
  layout: (W, H) => {
    const win = sholaWindow(W, H);
    return { slots: [{ id: "a", x: win.x, y: win.y, w: win.w, h: win.h, radius: win.r, role: "hero" }] };
  },
  paint: (ctx, W, H) => {
    fill(ctx, "#a30d14", 0, 0, W, H);
    mottle(ctx, 0, 0, W, H, "rgba(255,80,60,0.12)", "rgba(60,0,0,0.25)", 41, 0.9);
    grain(ctx, 0, 0, W, H, "rgba(0,0,0,0.10)", 42);
    const win = sholaWindow(W, H);
    vineBorder(ctx, 0, 0, W, H, win.x, 1, "#fff7ee", "#a30d14");
    ctx.beginPath();
    ctx.roundRect(win.x, win.y, win.w, win.h, win.r);
    ctx.fillStyle = "#fffaf2";
    ctx.fill();
  },
  over: (ctx, W, H) => {
    const win = sholaWindow(W, H);
    ropeFrame(ctx, win.x, win.y, win.w, win.h, win.r, 1, "#fff7ee");
  },
};

// ---------- সরাচিত্র গ্রিড: nine round photos on a red-yellow checker ----------

function saraGrid(W: number, H: number) {
  const tall = story(H);
  const cell = W / 3;
  const top = tall ? 420 : 135;
  return { cell, top, bottom: top + cell * 3, r: tall ? 150 : 148, tall };
}

const saraTemplate: TemplateDef = {
  id: "sara9",
  name: "সরাচিত্র গ্রিড",
  layout: (W, H): TemplateLayout => {
    const g = saraGrid(W, H);
    const slots = Array.from({ length: 9 }, (_, i) => {
      const cx = (i % 3) * g.cell + g.cell / 2;
      const cy = g.top + Math.floor(i / 3) * g.cell + g.cell / 2;
      return {
        id: `s${i}`,
        x: cx - g.r,
        y: cy - g.r,
        w: g.r * 2,
        h: g.r * 2,
        shape: "circle" as const,
        role: i === 4 ? ("hero" as const) : i % 2 ? ("thakur" as const) : ("people" as const),
      };
    });
    return {
      slots,
      texts: g.tall
        ? [
            { text: "পুজোর ঝলক", x: W / 2, y: 220, size: 132, font: "display", color: "#a3131b" },
            { text: "ষষ্ঠী থেকে দশমী", x: W / 2, y: 338, size: 46, font: "body", color: "#6b2a12" },
            { text: "শুভ শারদীয়া", x: W / 2, y: g.bottom + 250, size: 84, font: "display", color: "#a3131b" },
          ]
        : [
            { text: "পুজোর ঝলক", x: W / 2, y: 70, size: 76, font: "display", color: "#a3131b" },
            { text: "শুভ শারদীয়া ২০২৬", x: W / 2, y: g.bottom + 68, size: 40, font: "body", color: "#6b2a12" },
          ],
    };
  },
  paint: (ctx, W, H) => {
    const g = saraGrid(W, H);
    fill(ctx, "#fbf1dc", 0, 0, W, H);
    grain(ctx, 0, 0, W, H, "rgba(140,80,30,0.06)", 51);
    for (let i = 0; i < 9; i++) {
      const x = (i % 3) * g.cell;
      const y = g.top + Math.floor(i / 3) * g.cell;
      const yellow = i % 2 === 0;
      fill(ctx, yellow ? "#f5b50a" : "#fbf1dc", x + 5, y + 5, g.cell - 10, g.cell - 10);
      const cx = x + g.cell / 2;
      const cy = y + g.cell / 2;
      if (yellow) {
        ctx.beginPath();
        ctx.arc(cx, cy, g.r + 16, 0, Math.PI * 2);
        ctx.fillStyle = "#b3121b";
        ctx.fill();
      } else {
        dotRing(ctx, cx, cy, g.r + 20, 5, 17, "#b3121b");
      }
    }
    if (g.tall) {
      const y = g.bottom + 110;
      alpona(ctx, W / 2 - 300, y + 140, 48, "#b3121b", 8);
      alpona(ctx, W / 2 + 300, y + 140, 48, "#b3121b", 8);
    } else {
      alpona(ctx, 70, 68, 40, "#b3121b", 8);
      alpona(ctx, W - 70, 68, 40, "#b3121b", 8);
    }
    vignette(ctx, W, H, "rgba(90,40,10,0.12)");
  },
  over: (ctx, W, H) => {
    const g = saraGrid(W, H);
    for (let i = 0; i < 9; i++) {
      const cx = (i % 3) * g.cell + g.cell / 2;
      const cy = g.top + Math.floor(i / 3) * g.cell + g.cell / 2;
      ring(ctx, cx, cy, g.r, 6, i % 2 === 0 ? "#fbf1dc" : "#b3121b");
    }
  },
};

export const TEMPLATES: TemplateDef[] = [archTemplate, sareeTemplate("lalpar"), sareeTemplate("raat"), sholaTemplate, saraTemplate];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));
export const templateById = (id: string): TemplateDef => byId.get(id) ?? TEMPLATES[0];
