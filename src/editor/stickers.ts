// The sticker sheet: Pujo things drawn as plain vector shapes, with a white
// die-cut edge like a printed sticker. One description renders both as SVG
// in the editor and on the export canvas, so they always match. No emoji.

export type Prim = {
  d: string;
  fill?: string;
  stroke?: string;
  sw?: number;
  op?: number;
  evenodd?: boolean;
  cut?: boolean; // part of the white die-cut outline (default: yes)
};

export type StickerDef = { id: string; name: string; w: number; h: number; prims: Prim[]; cut?: number };

// ---------- tiny path builder ----------

type Pt = [number, number];
type Cmd = ["M", ...Pt] | ["L", ...Pt] | ["Q", ...Pt, ...Pt] | ["C", ...Pt, ...Pt, ...Pt] | ["Z"];
type Xf = { x?: number; y?: number; r?: number; s?: number; sx?: number; sy?: number };

const n2 = (v: number) => Math.round(v * 100) / 100;

function xfPt([px, py]: Pt, t: Xf): Pt {
  const sx = (t.sx ?? 1) * (t.s ?? 1);
  const sy = (t.sy ?? 1) * (t.s ?? 1);
  const a = t.r ?? 0;
  const x = px * sx;
  const y = py * sy;
  return [n2(x * Math.cos(a) - y * Math.sin(a) + (t.x ?? 0)), n2(x * Math.sin(a) + y * Math.cos(a) + (t.y ?? 0))];
}

function build(cmds: Cmd[], t: Xf = {}): string {
  return cmds
    .map((c) => {
      const [k, ...v] = c as [string, ...number[]];
      const pts: string[] = [];
      for (let i = 0; i < v.length; i += 2) pts.push(xfPt([v[i], v[i + 1]], t).join(" "));
      return k + pts.join(" ");
    })
    .join("");
}

const circle = (cx: number, cy: number, r: number) =>
  `M${n2(cx - r)} ${n2(cy)}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n2(cx - rx)} ${n2(cy)}a${n2(rx)} ${n2(ry)} 0 1 0 ${n2(2 * rx)} 0a${n2(rx)} ${n2(ry)} 0 1 0 ${n2(-2 * rx)} 0Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const line = (pts: Pt[]) => "M" + pts.map((p) => p.join(" ")).join("L");

// Shapes with the base at the origin, pointing up (-y).
const lotusPetal = (L: number, w: number): Cmd[] => [["M", 0, 0], ["Q", w, -L * 0.5, 0, -L], ["Q", -w, -L * 0.5, 0, 0], ["Z"]];
const roundPetal = (L: number, w: number): Cmd[] => [
  ["M", 0, 0],
  ["C", w * 0.75, -L * 0.15, w * 0.6, -L, 0, -L],
  ["C", -w * 0.6, -L, -w * 0.75, -L * 0.15, 0, 0],
  ["Z"],
];
const leafShape = (L: number, w: number): Cmd[] => [["M", 0, 0], ["Q", w, -L * 0.45, 0, -L], ["Q", -w, -L * 0.45, 0, 0], ["Z"]];

// Wavy circle (marigold rows, hibiscus edges).
function frill(cx: number, cy: number, r: number, bumps: number, depth: number, phase = 0): string {
  const pts: string[] = [];
  const steps = bumps * 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 + phase;
    const rr = r + Math.cos(a * bumps - phase * bumps) * depth;
    pts.push(`${n2(cx + Math.cos(a) * rr)} ${n2(cy + Math.sin(a) * rr)}`);
  }
  return "M" + pts.join("L") + "Z";
}

const ring = (count: number, fn: (i: number, a: number) => string) =>
  Array.from({ length: count }, (_, i) => fn(i, (i / count) * Math.PI * 2)).join("");

const INK = "#4a1a0e";
const RED = "#c8102e";
const RED_D = "#8f0d18";
const GOLD = "#e3a53a";
const GOLD_L = "#f8d27a";
const CREAM = "#fbf1dc";
const WHITE = "#fffdf8";
const GREEN = "#3f7d3a";
const GREEN_D = "#24522a";
const PINK = "#ef8aa8";
const PINK_L = "#f9c6d3";
const PINK_D = "#c9496f";
const ORANGE = "#f08a1c";
const ORANGE_D = "#d4600e";
const YELLOW = "#ffc93c";
const CLAY = "#a9532b";
const CLAY_D = "#7a3a1d";
const TEAL = "#2f8c8c";
const TEAL_D = "#1f6262";
const WOOD = "#9a5a30";

const o = (d: string, fill: string, extra: Partial<Prim> = {}): Prim => ({ d, fill, stroke: INK, sw: 3, ...extra });
const s = (d: string, stroke: string, sw: number, extra: Partial<Prim> = {}): Prim => ({ d, stroke, sw, cut: false, ...extra });

// ---------- the sheet ----------

const shiuli: StickerDef = {
  id: "shiuli",
  name: "শিউলি",
  w: 140,
  h: 140,
  prims: [
    o(build([["M", -5, 0], ["L", 5, 0], ["L", 7, 58], ["Q", 0, 64, -7, 58], ["Z"]], { x: 70, y: 70, r: 0.55 }), ORANGE),
    o(ring(6, (_, a) => build(roundPetal(50, 30), { x: 70, y: 70, r: a })), WHITE),
    s(ring(6, (_, a) => build([["M", 0, -12], ["L", 0, -34]], { x: 70, y: 70, r: a })), "#e8dcc8", 2.5),
    o(circle(70, 70, 9), ORANGE),
  ],
};

const joba: StickerDef = {
  id: "joba",
  name: "জবা",
  w: 170,
  h: 170,
  prims: [
    o(
      ring(5, (_, a) =>
        build(
          [
            ["M", 0, 0],
            ["C", 38, -14, 50, -50, 34, -66],
            ["Q", 22, -78, 10, -70],
            ["Q", 0, -82, -12, -70],
            ["Q", -26, -78, -36, -64],
            ["C", -50, -48, -36, -14, 0, 0],
            ["Z"],
          ],
          { x: 85, y: 88, r: a },
        ),
      ),
      RED,
    ),
    s(ring(5, (_, a) => build([["M", 0, -14], ["Q", 4, -36, 0, -56]], { x: 85, y: 88, r: a })), RED_D, 3),
    { d: circle(85, 88, 16), fill: RED_D, cut: false },
    s(line([[85, 88], [138, 34]]), "#f6e7b0", 6),
    { d: ring(7, (i) => circle(128 + (i % 3) * 6 - 4, 34 + Math.floor(i / 3) * 6 - 2, 3.4)), fill: YELLOW, stroke: INK, sw: 1.2 },
  ],
};

const padma: StickerDef = {
  id: "padma",
  name: "পদ্ম",
  w: 200,
  h: 160,
  prims: [
    o(build(leafShape(60, 26), { x: 100, y: 140, r: -1.9 }) + build(leafShape(60, 26), { x: 100, y: 140, r: 1.9 }), GREEN),
    o(build(lotusPetal(78, 30), { x: 100, y: 140, r: -1.05 }) + build(lotusPetal(78, 30), { x: 100, y: 140, r: 1.05 }), PINK_L),
    o(build(lotusPetal(100, 34), { x: 100, y: 140, r: -0.55 }) + build(lotusPetal(100, 34), { x: 100, y: 140, r: 0.55 }), PINK),
    o(build(lotusPetal(118, 36), { x: 100, y: 140 }), PINK),
    s(
      build([["M", 0, -12], ["L", 0, -96]], { x: 100, y: 140 }) +
        build([["M", 0, -12], ["L", 0, -80]], { x: 100, y: 140, r: -0.55 }) +
        build([["M", 0, -12], ["L", 0, -80]], { x: 100, y: 140, r: 0.55 }),
      PINK_D,
      2,
    ),
    o(build(lotusPetal(70, 30), { x: 100, y: 142, r: -0.3 }) + build(lotusPetal(70, 30), { x: 100, y: 142, r: 0.3 }), PINK_D),
  ],
};

const prodip: StickerDef = {
  id: "prodip",
  name: "প্রদীপ",
  w: 180,
  h: 150,
  prims: [
    o("M18 92 Q24 136 86 138 Q148 136 160 96 L178 84 Q166 80 150 88 Z", CLAY),
    o(ellipse(88, 92, 70, 14), CLAY_D),
    s("M22 100 Q88 120 156 100", GOLD_L, 4),
    { d: ring(9, (i) => circle(34 + i * 13.5, 116 + Math.sin(i * 0.4) * 2, 3.2)), fill: CREAM, cut: false },
    o("M170 82 C150 60 152 34 166 14 C182 36 186 60 170 82 Z", ORANGE),
    { d: "M170 78 C160 64 160 48 168 34 C177 48 179 64 170 78 Z", fill: YELLOW, cut: false },
    { d: "M170 74 C165 66 165 56 169 48 C174 56 175 66 170 74 Z", fill: WHITE, cut: false },
  ],
};

const dhak: StickerDef = {
  id: "dhak",
  name: "ঢাক",
  w: 220,
  h: 200,
  prims: [
    // the white plume on top
    o(
      "M110 86 C98 60 70 56 62 36 C80 40 84 26 96 30 C100 16 116 18 118 30 C130 18 146 26 142 40 C156 42 158 58 144 62 C136 74 122 76 110 86 Z",
      WHITE,
    ),
    s("M108 82 C102 64 92 50 80 40 M112 80 C114 60 120 46 130 36 M110 84 C116 70 130 60 144 56", "#d9cfc0", 2.4),
    // barrel
    o("M38 96 C70 84 150 84 182 96 L182 166 C150 180 70 180 38 166 Z", RED),
    { d: "M70 90 L70 175 L88 177 L88 88 Z M132 88 L132 177 L150 175 L150 90 Z", fill: CREAM, cut: false },
    s("M40 112 L60 150 L80 112 L100 150 L120 112 L140 150 L160 112 L180 150", GOLD, 3),
    o(ellipse(38, 131, 14, 36), CREAM),
    o(ellipse(182, 131, 14, 36), CREAM),
    s("M60 186 L28 196 M160 186 L192 196", GOLD, 5),
    o(circle(24, 197, 6) + circle(196, 197, 6), GOLD),
  ],
};

const shankh: StickerDef = {
  id: "shankh",
  name: "শাঁখ",
  w: 200,
  h: 130,
  prims: [
    o("M30 70 C30 30 70 16 104 26 C140 36 170 52 192 64 C170 76 140 98 104 106 C70 114 30 104 30 70 Z", CREAM),
    o("M70 96 C90 82 120 80 150 86 C130 98 104 106 82 106 Z", "#f3a58a"),
    s("M64 70 C64 52 82 46 92 56 C100 66 90 78 80 72 C74 68 78 60 84 62", "#8a5a3a", 3),
    s("M104 30 C110 50 110 70 104 92 M128 38 C134 54 134 72 128 86 M152 50 C156 58 156 68 152 76", "#cbb79a", 3),
  ],
};

const dhunuchi: StickerDef = {
  id: "dhunuchi",
  name: "ধুনুচি",
  w: 150,
  h: 200,
  prims: [
    s("M62 96 C40 76 76 62 58 40 C46 26 62 12 70 6 M90 96 C110 78 80 64 98 46 C108 34 96 20 90 14", "#c9c1b6", 7, { cut: true }),
    o("M24 96 L126 96 C122 130 100 146 75 146 C50 146 28 130 24 96 Z", CLAY),
    o(ellipse(75, 96, 51, 11), "#3a160c"),
    { d: ellipse(75, 95, 42, 7), fill: ORANGE_D, cut: false },
    { d: circle(62, 94, 5) + circle(82, 96, 6) + circle(94, 93, 4), fill: YELLOW, cut: false },
    o("M64 146 L86 146 L90 172 L60 172 Z", CLAY_D),
    o(ellipse(75, 178, 30, 9), CLAY),
    s("M34 118 Q75 132 116 118", GOLD_L, 3),
  ],
};

const kash: StickerDef = {
  id: "kash",
  name: "কাশফুল",
  w: 160,
  h: 220,
  prims: [
    s("M80 214 C78 160 60 110 40 70 M80 214 C82 150 84 100 92 48 M80 214 C88 166 108 126 128 92", "#8b7a4a", 4.5, { cut: true }),
    o("M40 70 C24 52 20 26 28 6 C40 20 50 38 52 58 C50 66 46 70 40 70 Z", WHITE),
    o("M92 48 C80 30 80 10 90 -6 C102 10 106 28 102 44 C100 48 96 50 92 48 Z", WHITE),
    o("M128 92 C120 70 124 46 138 30 C146 50 146 70 138 86 C136 92 132 94 128 92 Z", WHITE),
    s("M32 18 L44 60 M90 2 L94 42 M136 40 L132 84", "#ddd2c0", 2),
  ],
};

const chokh: StickerDef = {
  id: "chokh",
  name: "মায়ের চোখ",
  w: 240,
  h: 130,
  prims: [
    o(rrect(6, 8, 228, 114, 57), "#f2b63c"),
    // two eyes with the long kajal wing
    o("M30 74 C54 46 92 44 112 70 C92 86 56 90 30 74 Z M128 70 C148 44 186 46 210 74 C184 90 148 86 128 70 Z", WHITE),
    { d: circle(80, 68, 13) + circle(160, 68, 13), fill: "#1a0d08", cut: false },
    { d: circle(84, 64, 4) + circle(164, 64, 4), fill: WHITE, cut: false },
    s("M24 76 C52 50 92 46 116 72 C94 90 54 92 22 80 L12 84 M216 76 C188 50 148 46 124 72 C146 90 186 92 218 80 L228 84", "#1a0d08", 5),
    s("M32 44 C60 26 96 30 110 42 M130 42 C144 30 180 26 208 44", "#1a0d08", 6),
    o("M120 18 C128 28 128 44 120 54 C112 44 112 28 120 18 Z", WHITE),
    { d: circle(120, 36, 5), fill: "#1a0d08", cut: false },
    { d: circle(120, 98, 9), fill: RED, cut: false },
  ],
};

const jhumka: StickerDef = {
  id: "jhumka",
  name: "ঝুমকো",
  w: 110,
  h: 190,
  prims: [
    o(circle(55, 22, 17), GOLD),
    { d: circle(55, 22, 7), fill: RED, cut: false },
    o(rrect(51, 38, 8, 20, 3), GOLD),
    o("M14 112 C14 74 34 56 55 56 C76 56 96 74 96 112 Z", GOLD),
    s("M22 98 Q55 80 88 98", GOLD_L, 3),
    { d: ring(7, (i) => circle(26 + i * 9.7, 106, 3)), fill: RED, cut: false },
    s(ring(9, (i) => `M${18 + i * 9.25} 112 L${18 + i * 9.25} ${132 + (i % 2) * 10}`), INK, 2, { cut: true }),
    o(ring(9, (i) => circle(18 + i * 9.25, 136 + (i % 2) * 10, 4.5)), GOLD_L, { sw: 1.5 }),
  ],
};

const shakhaPola: StickerDef = {
  id: "shakha",
  name: "শাঁখা-পলা",
  w: 200,
  h: 150,
  prims: [
    o(ellipse(124, 80, 66, 52) + ellipse(124, 80, 46, 34), RED, { evenodd: true }),
    s(ellipse(124, 80, 56, 43), RED_D, 2),
    o(ellipse(76, 72, 66, 52) + ellipse(76, 72, 46, 34), WHITE, { evenodd: true }),
    s(ring(14, (_, a) => `M${n2(76 + Math.cos(a) * 48)} ${n2(72 + Math.sin(a) * 36)}L${n2(76 + Math.cos(a) * 64)} ${n2(72 + Math.sin(a) * 50)}`), "#c9b89a", 2.4),
  ],
};

const sindoor: StickerDef = {
  id: "sindoor",
  name: "সিঁদুর কৌটো",
  w: 160,
  h: 150,
  prims: [
    o(ellipse(104, 40, 46, 20), WOOD),
    s(ellipse(104, 40, 34, 13), GOLD_L, 3),
    o("M14 80 L114 80 L114 120 C114 136 14 136 14 120 Z", "#9e2a14"),
    s("M14 104 C40 116 88 116 114 104", GOLD, 4),
    o(ellipse(64, 80, 50, 15), GOLD),
    { d: "M22 80 C30 64 98 64 106 80 C96 92 32 92 22 80 Z", fill: "#e01f2a", cut: false },
  ],
};

const radio: StickerDef = {
  id: "radio",
  name: "রেডিও",
  w: 200,
  h: 160,
  prims: [
    s("M140 40 L176 4", INK, 4, { cut: true }),
    o(rrect(10, 38, 180, 116, 22), WOOD),
    o(rrect(24, 52, 152, 88, 14), CREAM),
    o(circle(70, 96, 32), "#e7d6b5"),
    s(ring(6, (i) => `M${48 + i * 8.8} 74 L${48 + i * 8.8} 118`), "#9a7a52", 2.5),
    o(rrect(116, 66, 48, 20, 6), GOLD_L),
    s("M124 76 L156 76", INK, 2),
    o(circle(126, 116, 9) + circle(154, 116, 9), "#5a2a14"),
  ],
};

const gramophone: StickerDef = {
  id: "gramophone",
  name: "গ্রামোফোন",
  w: 200,
  h: 210,
  prims: [
    o("M62 132 C62 112 78 96 96 92 L150 20 C172 24 192 44 194 66 L110 116 C110 126 100 138 86 140 Z", GOLD),
    s("M150 20 C162 40 176 54 194 66 M100 96 L172 32 M104 104 L184 48", "#b97e22", 3),
    o(ellipse(172, 42, 18, 30), GOLD_L, { sw: 3 }),
    o(rrect(22, 140, 128, 58, 8), WOOD),
    s("M30 154 L142 154", GOLD_L, 3),
    o(ellipse(86, 140, 60, 10), "#2a140c"),
  ],
};

const camera: StickerDef = {
  id: "camera",
  name: "ক্যামেরা",
  w: 200,
  h: 150,
  prims: [
    o(rrect(36, 16, 44, 22, 6), "#5a2a14"),
    o(rrect(8, 32, 184, 108, 20), TEAL),
    { d: rrect(8, 60, 184, 18, 0), fill: RED, cut: false },
    s(ring(10, (i) => `M${16 + i * 18} 62 L${24 + i * 18} 76`), GOLD_L, 3),
    o(circle(100, 92, 40), CREAM),
    o(circle(100, 92, 28), "#1a2a2a"),
    { d: circle(108, 84, 8), fill: "#9fd6d6", cut: false },
    o(rrect(150, 42, 28, 14, 4), GOLD_L),
  ],
};

const gada: StickerDef = {
  id: "gada",
  name: "গাঁদা",
  w: 150,
  h: 150,
  prims: [
    o(frill(75, 75, 64, 16, 6), ORANGE_D),
    o(frill(75, 75, 48, 14, 5, 0.2), ORANGE),
    o(frill(75, 75, 31, 11, 4, 0.1), YELLOW),
    { d: ring(9, (i, a) => circle(75 + Math.cos(a) * 12 * (i % 2 ? 1 : 0.4), 75 + Math.sin(a) * 12 * (i % 2 ? 1 : 0.4), 3)), fill: ORANGE_D, cut: false },
  ],
};

const prajapati: StickerDef = {
  id: "butterfly",
  name: "প্রজাপতি",
  w: 180,
  h: 150,
  prims: [
    o("M90 72 C60 20 18 14 14 42 C10 70 50 82 90 76 Z M90 72 C120 20 162 14 166 42 C170 70 130 82 90 76 Z", ORANGE),
    o("M90 80 C60 84 30 100 40 124 C50 142 80 120 90 86 Z M90 80 C120 84 150 100 140 124 C130 142 100 120 90 86 Z", TEAL),
    { d: circle(44, 44, 8) + circle(136, 44, 8) + circle(56, 112, 6) + circle(124, 112, 6), fill: CREAM, cut: false },
    o(rrect(85, 50, 10, 76, 5), "#2a140c"),
    s("M88 52 C80 34 70 26 60 22 M92 52 C100 34 110 26 120 22", "#2a140c", 3, { cut: true }),
  ],
};

const paan: StickerDef = {
  id: "paan",
  name: "পান পাতা",
  w: 140,
  h: 170,
  prims: [
    s("M70 150 L70 168", GREEN_D, 6, { cut: true }),
    o("M70 150 C30 120 6 80 14 46 C22 14 58 10 70 36 C82 10 118 14 126 46 C134 80 110 120 70 150 Z", GREEN),
    s("M70 146 L70 40 M70 120 C50 108 36 94 28 74 M70 120 C90 108 104 94 112 74 M70 92 C54 82 44 70 40 56 M70 92 C86 82 96 70 100 56", "#a6cf8f", 2.6),
  ],
};

const ghanta: StickerDef = {
  id: "ghanta",
  name: "ঘণ্টা",
  w: 130,
  h: 180,
  prims: [
    o(rrect(57, 4, 16, 44, 7) + circle(65, 10, 10), GOLD),
    o("M20 140 C20 90 34 52 65 52 C96 52 110 90 110 140 Z", GOLD),
    o(rrect(10, 136, 110, 14, 7), GOLD_L),
    s("M40 120 Q65 108 90 120", "#b97e22", 3),
    o(circle(65, 162, 12), GOLD),
  ],
};

const alponaSticker: StickerDef = {
  id: "alpona",
  name: "আলপনা",
  w: 170,
  h: 170,
  prims: [
    o(circle(85, 85, 80), RED),
    {
      d: ring(8, (_, a) => build(lotusPetal(52, 20), { x: 85, y: 85, r: a })),
      fill: "none",
      stroke: WHITE,
      sw: 4,
      cut: false,
    },
    { d: ring(8, (_, a) => circle(85 + Math.cos(a - Math.PI / 2) * 66, 85 + Math.sin(a - Math.PI / 2) * 66, 5)), fill: WHITE, cut: false },
    { d: ring(16, (_, a) => circle(85 + Math.cos(a) * 74, 85 + Math.sin(a) * 74, 2.4)), fill: WHITE, cut: false },
    { d: circle(85, 85, 12), fill: WHITE, cut: false },
  ],
};

const washi: StickerDef = {
  id: "washi",
  name: "টেপ",
  w: 240,
  h: 64,
  cut: 0,
  prims: [
    {
      d: "M6 8 L14 14 L8 22 L16 30 L8 38 L14 46 L6 56 L234 56 L228 48 L236 40 L228 32 L236 24 L228 16 L234 8 Z",
      fill: "#e8b4a0",
      op: 0.88,
    },
    { d: ring(9, (i) => circle(30 + i * 23, 32, 7)), fill: "#fff3e4", op: 0.75, cut: false },
    { d: ring(9, (i) => circle(30 + i * 23, 32, 2.6)), fill: RED, op: 0.7, cut: false },
  ],
};

const leafGreen: StickerDef = {
  id: "aam",
  name: "আমপাতা",
  w: 220,
  h: 110,
  prims: [
    s("M10 18 C70 30 150 30 210 18", "#6b4a2a", 4, { cut: true }),
    o(
      ring(5, (i) => build(leafShape(80, 22), { x: 34 + i * 38, y: 26 + Math.sin(i) * 2, r: Math.PI + (i - 2) * 0.12 })),
      GREEN,
    ),
    s(ring(5, (i) => build([["M", 0, -6], ["L", 0, -72]], { x: 34 + i * 38, y: 26, r: Math.PI + (i - 2) * 0.12 })), "#a6cf8f", 2),
  ],
};

export const STICKERS: StickerDef[] = [
  dhak,
  shankh,
  joba,
  padma,
  prodip,
  dhunuchi,
  kash,
  shiuli,
  chokh,
  jhumka,
  shakhaPola,
  sindoor,
  gada,
  paan,
  ghanta,
  radio,
  gramophone,
  camera,
  prajapati,
  alponaSticker,
  leafGreen,
  washi,
];

const byId = new Map(STICKERS.map((st) => [st.id, st]));
export const stickerById = (id: string) => byId.get(id);

// Padding around the drawing so the die-cut edge and shadow are not clipped.
export const stickerPad = (def: StickerDef) => (def.cut ?? 12) / 2 + 4;
export const stickerBox = (def: StickerDef) => {
  const p = stickerPad(def);
  return { w: def.w + p * 2, h: def.h + p * 2, pad: p };
};

// Draws a sticker centred at (0, 0), `width` px wide (including the edge).
export function drawSticker(ctx: CanvasRenderingContext2D, def: StickerDef, width: number) {
  const box = stickerBox(def);
  const k = width / box.w;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(-box.w / 2 + box.pad, -box.h / 2 + box.pad);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const cut = def.cut ?? 12;
  if (cut > 0) {
    for (const pass of [0, 1]) {
      ctx.save();
      if (pass === 0) ctx.translate(0, 3);
      const color = pass === 0 ? "rgba(40,10,5,0.22)" : "#ffffff";
      for (const p of def.prims) {
        if (p.cut === false) continue;
        const path = new Path2D(p.d);
        if (p.fill && p.fill !== "none") {
          ctx.fillStyle = color;
          ctx.fill(path, p.evenodd ? "evenodd" : "nonzero");
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = (p.stroke ? p.sw ?? 0 : 0) + cut;
        ctx.stroke(path);
      }
      ctx.restore();
    }
  }
  for (const p of def.prims) {
    const path = new Path2D(p.d);
    ctx.globalAlpha = p.op ?? 1;
    if (p.fill && p.fill !== "none") {
      ctx.fillStyle = p.fill;
      ctx.fill(path, p.evenodd ? "evenodd" : "nonzero");
    }
    if (p.stroke && p.sw) {
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = p.sw;
      ctx.stroke(path);
    }
  }
  ctx.restore();
}
