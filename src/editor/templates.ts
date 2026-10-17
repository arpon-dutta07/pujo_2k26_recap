// Every template: where the photos go, its default words and stickers, and the
// art drawn under and over the photos. Layouts are functions of the canvas
// size, so each template works as a 4:5 post and as a 9:16 story.
import { alpona, paperGrain, sareeBorder, seeded, THEMES } from "../lib/render/draw";
import {
  alponaArch,
  daisy,
  dotRing,
  fill,
  grain,
  laceFrame,
  leaf,
  lotusBloom,
  lotusBud,
  lotusDivider,
  lotusLeaf,
  mottle,
  photoBacking,
  playerCard,
  quilt,
  rectPerimeterPoints,
  ring,
  ropeFrame,
  shadowed,
  sprig,
  stem,
  velvet,
  vignette,
  vineBorder,
} from "./paint";
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

// ---------- পদ্মবন: gold-lined lotuses on deep green, two framed photos ----------

function lotusColumn(ctx: CanvasRenderingContext2D, x0: number, H: number, seed: number) {
  const rnd = seeded(seed);
  const blooms: Array<[number, number, number, number]> = [
    [x0 + 190, H * 0.17, 230, -0.08],
    [x0 + 270, H * 0.41, 250, 0.12],
    [x0 + 120, H * 0.63, 215, -0.15],
    [x0 + 260, H * 0.88, 240, 0.06],
  ];
  const leaves: Array<[number, number, number, number, number]> = [
    [x0 + 110, H * 0.29, 150, 74, -0.45],
    [x0 + 330, H * 0.55, 150, 82, 0.4],
    [x0 + 70, H * 0.77, 140, 70, 0.2],
    [x0 + 150, H * 0.99, 175, 88, -0.3],
  ];
  const buds: Array<[number, number, number, number]> = [
    [x0 + 360, H * 0.07, 110, 0.3],
    [x0 + 60, H * 0.47, 96, -0.35],
    [x0 + 380, H * 0.73, 100, 0.28],
  ];
  for (let i = 0; i < 7; i++) sprig(ctx, x0 + 40 + rnd() * 360, H * (0.08 + rnd() * 0.9), 70 + rnd() * 50, rnd() * 1.2 - 0.6, 1);
  for (const [cx, cy, rx, ry, r] of leaves) lotusLeaf(ctx, cx, cy, rx, ry, r, 1);
  for (const [bx, by] of [...blooms, ...buds]) stem(ctx, [[bx - 50, H + 40], [bx + 40, (by + H) / 2], [bx, by + 6]], 7, 1);
  for (const [bx, by, s, r] of blooms) lotusBloom(ctx, bx, by, s, r, 1);
  for (const [bx, by, s, r] of buds) lotusBud(ctx, bx, by, s, r, 1);
}

function padmaGeo(W: number, H: number) {
  const x = 470;
  const w = W - x - 60;
  return story(H)
    ? { x, w, a: { y: 220, h: 640 }, b: { y: 1010, h: 640 }, dividers: [130, 935, 1760] }
    : { x, w, a: { y: 150, h: 470 }, b: { y: 735, h: 470 }, dividers: [84, 678, 1272] };
}

const padmaTemplate: TemplateDef = {
  id: "padma",
  name: "পদ্মবন",
  layout: (W, H) => {
    const g = padmaGeo(W, H);
    return {
      slots: [
        { id: "a", x: g.x, y: g.a.y, w: g.w, h: g.a.h, role: "hero" },
        { id: "b", x: g.x, y: g.b.y, w: g.w, h: g.b.h, role: "any" },
      ],
    };
  },
  paint: (ctx, W, H) => {
    fill(ctx, "#0e2a1f", 0, 0, W, H);
    mottle(ctx, 0, 0, W, H, "rgba(90,170,120,0.09)", "rgba(0,0,0,0.30)", 101, 1.2);
    grain(ctx, 0, 0, W, H, "rgba(220,200,140,0.05)", 102);
    lotusColumn(ctx, 0, H, 103);
    const g = padmaGeo(W, H);
    for (const s of [g.a, g.b]) fill(ctx, "#c3d1b6", g.x, s.y, g.w, s.h);
    for (const y of g.dividers) lotusDivider(ctx, g.x + g.w / 2, y, g.w * 0.86, 1.3);
  },
  over: (ctx, W, H) => {
    const g = padmaGeo(W, H);
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 4;
    for (const s of [g.a, g.b]) ctx.strokeRect(g.x, s.y, g.w, s.h);
  },
};

// ---------- এখন বাজছে: maroon velvet, one photo, a torn-paper music player ----------

function velvetGeo(W: number, H: number) {
  return story(H)
    ? { slot: { x: 80, y: 110, w: W - 160, h: 1080, r: 34 }, cy: 1500, ch: 390 }
    : { slot: { x: 80, y: 80, w: W - 160, h: 760, r: 30 }, cy: 1075, ch: 330 };
}

const velvetTemplate: TemplateDef = {
  id: "velvet",
  name: "এখন বাজছে",
  layout: (W, H) => {
    const g = velvetGeo(W, H);
    const L = W / 2 - 430 + 70;
    const R = W / 2 + 430 - 70;
    return {
      slots: [{ id: "a", x: g.slot.x, y: g.slot.y, w: g.slot.w, h: g.slot.h, radius: g.slot.r, role: "hero" }],
      texts: [
        { text: "ঢাকের বোল · পাড়ার প্যান্ডেল", x: W / 2, y: g.cy - g.ch * 0.16, size: 40, font: "body", color: "#2a1712" },
        { text: "০:১৬", x: L, y: g.cy + g.ch * 0.08 + 34, size: 26, font: "body", color: "#5a3a2a", align: "left" },
        { text: "৩:৩৭", x: R, y: g.cy + g.ch * 0.08 + 34, size: 26, font: "body", color: "#5a3a2a", align: "right" },
      ],
      stickers: [
        { kind: "shiuli", x: W - 130, y: g.slot.y + 40, size: 170, rotate: 18 },
        { kind: "shiuli", x: W - 60, y: g.slot.y + 150, size: 112, rotate: -12 },
      ],
    };
  },
  paint: (ctx, W, H) => {
    velvet(ctx, 0, 0, W, H, "#5a0d16", 111);
    vignette(ctx, W, H, "rgba(15,0,3,0.5)");
    const g = velvetGeo(W, H);
    ctx.save();
    shadowed(ctx, 30, 12, "rgba(0,0,0,0.5)");
    ctx.beginPath();
    ctx.roundRect(g.slot.x, g.slot.y, g.slot.w, g.slot.h, g.slot.r);
    ctx.fillStyle = "#3a0810";
    ctx.fill();
    ctx.restore();
    playerCard(ctx, W / 2, g.cy, 860, g.ch, 0, 1);
  },
};

// ---------- গালিচা: patchwork carpet with one big window ----------

const CARPET = ["#7a1420", "#a3131b", "#c98b2b", "#e0b04a", "#3e6b3a", "#2f6f6b", "#efe0c2", "#22304a", "#b2456a"];

const galichaWin = (W: number, H: number) => (story(H) ? { x: 110, y: 230, w: W - 220, h: 1460 } : { x: 110, y: 150, w: W - 220, h: 1050 });

const galichaTemplate: TemplateDef = {
  id: "galicha",
  name: "গালিচা",
  layout: (W, H) => {
    const w = galichaWin(W, H);
    return {
      slots: [{ id: "a", ...w, role: "hero" }],
      stickers: [
        { kind: "padma", x: W - 150, y: w.y + w.h + 10, size: 300, rotate: -6 },
        { kind: "joba", x: 130, y: w.y - 10, size: 220, rotate: -12 },
      ],
    };
  },
  paint: (ctx, W, H) => {
    quilt(ctx, 0, 0, W, H, CARPET, 121, 1, 230);
    const w = galichaWin(W, H);
    ctx.save();
    shadowed(ctx, 34, 14, "rgba(0,0,0,0.5)");
    velvet(ctx, w.x, w.y, w.w, w.h, "#5e0c16", 122);
    ctx.restore();
  },
  over: (ctx, W, H) => {
    const w = galichaWin(W, H);
    ctx.strokeStyle = "#e9c46a";
    ctx.lineWidth = 6;
    ctx.strokeRect(w.x - 3, w.y - 3, w.w + 6, w.h + 6);
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x - 14, w.y - 14, w.w + 28, w.h + 28);
  },
};

// ---------- গোলাপি প্যাচওয়ার্ক: pink block prints, two offset photos ----------

const PINKS = ["#e8437a", "#c2185b", "#f06292", "#ff8a80", "#f8bbd0", "#ad1457", "#ffb74d", "#f3a1b8"];

function golapiGeo(H: number) {
  return story(H)
    ? { a: { x: 300, y: 110, w: 700, h: 790 }, b: { x: 80, y: 990, w: 700, h: 790 } }
    : { a: { x: 300, y: 90, w: 700, h: 545 }, b: { x: 80, y: 715, w: 620, h: 545 } };
}

const golapiTemplate: TemplateDef = {
  id: "golapi",
  name: "গোলাপি প্যাচওয়ার্ক",
  layout: (W, H) => {
    const g = golapiGeo(H);
    return {
      slots: [
        { id: "a", ...g.a, role: "hero" },
        { id: "b", ...g.b, role: "any" },
      ],
      stickers: [
        { kind: "camera", x: 190, y: story(H) ? 200 : 150, size: 300, rotate: -12 },
        { kind: "gramophone", x: W - 170, y: H - 170, size: 290, rotate: 4 },
      ],
    };
  },
  paint: (ctx, W, H) => {
    quilt(ctx, 0, 0, W, H, PINKS, 131, 1, 200);
    const g = golapiGeo(H);
    for (const s of [g.a, g.b]) {
      ctx.save();
      shadowed(ctx, 26, 10, "rgba(80,0,30,0.4)");
      fill(ctx, "#f6a9bb", s.x, s.y, s.w, s.h);
      ctx.restore();
    }
  },
};

// ---------- কোলাজ মুডবোর্ড: sage paper, a lace frame and four torn photos ----------

type RotSlot = { x: number; y: number; w: number; h: number; rot: number };

function collageGeo(H: number): { main: RotSlot; others: RotSlot[] } {
  return story(H)
    ? {
        main: { x: 240, y: 620, w: 600, h: 760, rot: 0 },
        others: [
          { x: 50, y: 90, w: 360, h: 380, rot: -6 },
          { x: 670, y: 140, w: 360, h: 400, rot: 5 },
          { x: 50, y: 1470, w: 360, h: 380, rot: 4 },
          { x: 670, y: 1450, w: 360, h: 380, rot: -5 },
        ],
      }
    : {
        main: { x: 300, y: 380, w: 480, h: 600, rot: 0 },
        others: [
          { x: 50, y: 50, w: 300, h: 300, rot: -6 },
          { x: 730, y: 70, w: 300, h: 330, rot: 5 },
          { x: 50, y: 1000, w: 300, h: 300, rot: 4 },
          { x: 720, y: 990, w: 310, h: 300, rot: -5 },
        ],
      };
}

const collageTemplate: TemplateDef = {
  id: "collage",
  name: "কোলাজ মুডবোর্ড",
  layout: (W, H) => {
    const g = collageGeo(H);
    const tall = story(H);
    return {
      slots: [
        { id: "m", x: g.main.x, y: g.main.y, w: g.main.w, h: g.main.h, role: "hero" },
        ...g.others.map((s, i) => ({ id: `o${i}`, x: s.x, y: s.y, w: s.w, h: s.h, rotate: s.rot, role: (i % 2 ? "thakur" : "people") as "thakur" | "people" })),
      ],
      stickers: [
        { kind: "padma", x: W - 150, y: tall ? 1010 : 640, size: 250, rotate: 8 },
        { kind: "alpona", x: 140, y: tall ? 1000 : 650, size: 210, rotate: 0 },
        { kind: "washi", x: g.main.x + g.main.w / 2, y: g.main.y - 46, size: 280, rotate: -3 },
      ],
    };
  },
  paint: (ctx, W, H) => {
    fill(ctx, "#a9ae8c", 0, 0, W, H);
    mottle(ctx, 0, 0, W, H, "rgba(255,255,230,0.22)", "rgba(60,70,40,0.20)", 141, 1.2);
    grain(ctx, 0, 0, W, H, "rgba(50,50,20,0.08)", 142);
    ctx.globalAlpha = 0.18;
    alpona(ctx, W * 0.5, H * 0.5, W * 0.55, "#fffbe8", 12);
    ctx.globalAlpha = 1;
    const g = collageGeo(H);
    laceFrame(ctx, g.main.x, g.main.y, g.main.w, g.main.h, 1);
    g.others.forEach((s, i) => photoBacking(ctx, { ...s, rotate: s.rot }, 16, 150 + i, 1));
  },
};

// ---------- মেরুন কোলাজ: red-magenta ground, a quilted frame and a paper card ----------

function maroonGeo(H: number) {
  return story(H)
    ? { a: { x: 150, y: 170, w: 860, h: 640 }, b: { x: 330, y: 960, w: 600, h: 760 } }
    : { a: { x: 190, y: 110, w: 800, h: 500 }, b: { x: 400, y: 710, w: 480, h: 540 } };
}

const MAROON_QUILT = ["#c98b2b", "#7a1420", "#2f6f6b", "#e0b04a", "#efe0c2", "#b2456a", "#3e6b3a"];

const maroonTemplate: TemplateDef = {
  id: "maroon",
  name: "মেরুন কোলাজ",
  layout: (W, H) => {
    const g = maroonGeo(H);
    const tall = story(H);
    return {
      slots: [
        { id: "a", ...g.a, role: "hero" },
        { id: "b", ...g.b, role: "any" },
      ],
      stickers: [
        { kind: "joba", x: 190, y: tall ? 1080 : 820, size: 240, rotate: -10 },
        { kind: "jhumka", x: W - 80, y: tall ? 880 : 680, size: 130, rotate: 8 },
        { kind: "shakha", x: 200, y: tall ? 1560 : 1170, size: 260, rotate: 0 },
      ],
    };
  },
  paint: (ctx, W, H) => {
    const bg = ctx.createRadialGradient(W * 0.62, H * 0.42, 0, W * 0.62, H * 0.42, Math.hypot(W, H) * 0.7);
    bg.addColorStop(0, "#b8123e");
    bg.addColorStop(1, "#43050f");
    fill(ctx, bg, 0, 0, W, H);
    grain(ctx, 0, 0, W, H, "rgba(0,0,0,0.12)", 161);
    const g = maroonGeo(H);
    const band = 44;
    ctx.save();
    shadowed(ctx, 30, 12, "rgba(0,0,0,0.45)");
    fill(ctx, "#7a1420", g.a.x - band, g.a.y - band, g.a.w + band * 2, g.a.h + band * 2);
    ctx.restore();
    quilt(ctx, g.a.x - band, g.a.y - band, g.a.w + band * 2, g.a.h + band * 2, MAROON_QUILT, 162, 1, 90);
    fill(ctx, "#e2c38f", g.a.x, g.a.y, g.a.w, g.a.h);
    const p = 40;
    ctx.save();
    shadowed(ctx, 26, 10, "rgba(0,0,0,0.45)");
    fill(ctx, "#f1e2c4", g.b.x - p, g.b.y - p, g.b.w + p * 2, g.b.h + p * 2);
    ctx.restore();
    mottle(ctx, g.b.x - p, g.b.y - p, g.b.w + p * 2, g.b.h + p * 2, "rgba(255,255,255,0.2)", "rgba(150,100,40,0.14)", 163, 0.5);
    const pts = rectPerimeterPoints(g.b.x - p / 2, g.b.y - p / 2, g.b.w + p, g.b.h + p, 0, Math.round((2 * (g.b.w + g.b.h + 2 * p)) / 30));
    pts.forEach((pt, i) => {
      if (i % 2) leaf(ctx, pt.x, pt.y, 14, pt.a + Math.PI / 2, "#3e6b3a");
      else daisy(ctx, pt.x, pt.y, 10, 5, "#b3121b", "#e0b04a", i);
    });
  },
};

// ---------- panoramas: one long canvas cut into three slides ----------

const PANO = 3;

function padmaPanoGeo(H: number) {
  const k = story(H) ? 1.42 : 1;
  return [
    { id: "a", x: 110, y: 150 * k, w: 640, h: 820 * k },
    { id: "b", x: 860, y: 330 * k, w: 700, h: 760 * k },
    { id: "c", x: 1700, y: 120 * k, w: 620, h: 700 * k },
    { id: "d", x: 2400, y: 360 * k, w: 740, h: 800 * k },
  ];
}

const padmaPano: TemplateDef = {
  id: "padma-pano",
  name: "পদ্মবন প্যানোরামা",
  span: PANO,
  layout: (_W, H) => ({
    slots: padmaPanoGeo(H).map((s, i) => ({ ...s, role: i === 0 ? ("hero" as const) : ("any" as const) })),
    texts: [{ text: "শুভ শারদীয়া", x: 2770, y: story(H) ? 300 : 210, size: 104, font: "display", color: "#f2c46d" }],
  }),
  paint: (ctx, W, H) => {
    fill(ctx, "#0e2a1f", 0, 0, W, H);
    mottle(ctx, 0, 0, W, H, "rgba(90,170,120,0.09)", "rgba(0,0,0,0.30)", 171, 2.4);
    grain(ctx, 0, 0, W, H, "rgba(220,200,140,0.05)", 172);
    const rnd = seeded(173);
    // a vine running under all three slides, so the swipe feels joined up
    const base = H - (story(H) ? 170 : 120);
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 180) pts.push([x, base + Math.sin(x / 260) * 40]);
    for (let i = 0; i < 18; i++) sprig(ctx, rnd() * W, H * (0.05 + rnd() * 0.9), 60 + rnd() * 60, rnd() * 1.4 - 0.7, 1);
    for (let x = 60; x < W; x += 300) lotusLeaf(ctx, x + rnd() * 80, base + 50 + rnd() * 30, 120 + rnd() * 40, 60 + rnd() * 16, rnd() * 0.6 - 0.3, 1);
    stem(ctx, pts, 9, 1);
    for (const x of [250, 1080, 1960, 2860]) lotusBloom(ctx, x, base + Math.sin(x / 260) * 40 - 4, 230, rnd() * 0.3 - 0.15, 1);
    for (const x of [640, 1520, 2420, 3150]) lotusBud(ctx, x, base + Math.sin(x / 260) * 40, 100, rnd() * 0.5 - 0.25, 1);
    for (const s of padmaPanoGeo(H)) fill(ctx, "#c3d1b6", s.x, s.y, s.w, s.h);
  },
  over: (ctx, _W, H) => {
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 4;
    for (const s of padmaPanoGeo(H)) {
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x - 12, s.y - 12, s.w + 24, s.h + 24);
      ctx.lineWidth = 4;
    }
  },
};

function lalparPanoGeo(H: number) {
  const k = story(H) ? 1.4 : 1;
  return [
    { id: "a", x: 120, y: 150 * k, w: 760, h: 820 * k, rotate: -2 },
    { id: "b", x: 970, y: 250 * k, w: 620, h: 760 * k, rotate: 3 },
    { id: "c", x: 1700, y: 160 * k, w: 660, h: 740 * k, rotate: -3 },
    { id: "d", x: 2440, y: 290 * k, w: 680, h: 800 * k, rotate: 2 },
  ];
}

const lalparPano: TemplateDef = {
  id: "lalpar-pano",
  name: "লাল পাড় প্যানোরামা",
  span: PANO,
  layout: (_W, H) => {
    const slots = lalparPanoGeo(H);
    return {
      slots: slots.map((s, i) => ({ ...s, role: i === 0 ? ("hero" as const) : ("any" as const) })),
      texts: slots.map((s) => ({
        text: "পুজো",
        bind: { slot: s.id, field: "day" as const },
        x: s.x + s.w / 2,
        y: s.y + s.h + (story(H) ? 120 : 92),
        size: story(H) ? 84 : 70,
        font: "display" as const,
        color: "#a3131b",
        rotate: s.rotate,
      })),
    };
  },
  paint: (ctx, W, H) => {
    const t = THEMES.lalpar;
    fill(ctx, t.paper, 0, 0, W, H);
    paperGrain(ctx, W, H, t.grain, 181);
    sareeBorder(ctx, W, H, t);
    lalparPanoGeo(H).forEach((s) => {
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.rotate((s.rotate * Math.PI) / 180);
      shadowed(ctx, 26, 10, "rgba(60,20,10,0.35)");
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(-s.w / 2 - 22, -s.h / 2 - 22, s.w + 44, s.h + 44);
      ctx.restore();
    });
  },
};

export const TEMPLATES: TemplateDef[] = [
  archTemplate,
  sareeTemplate("lalpar"),
  padmaTemplate,
  velvetTemplate,
  galichaTemplate,
  golapiTemplate,
  collageTemplate,
  maroonTemplate,
  sholaTemplate,
  sareeTemplate("raat"),
  saraTemplate,
  padmaPano,
  lalparPano,
];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));
export const templateById = (id: string): TemplateDef => byId.get(id) ?? TEMPLATES[0];
