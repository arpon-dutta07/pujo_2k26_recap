import { EXPORT, SITE } from "../../config";
import { bnNum } from "../bn";
import type { PujoStats } from "../stats";
import type { Photo } from "../types";
import { FONT, alpona, coverRect, decodeForExport, ensureFonts, focusOf, paperGrain, roundRectPath, wrapLines } from "./draw";

const GOLD = "#f2c46d";
const CREAM = "#fbeedb";

async function polaroid(ctx: CanvasRenderingContext2D, photo: Photo, cx: number, cy: number, w: number, angle: number) {
  const h = w * 1.18;
  const pad = w * 0.06;
  const imgH = h - pad * 2 - w * 0.12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = "transparent";
  const bmp = await decodeForExport(photo);
  const iw = w - pad * 2;
  const r = coverRect(bmp.width, bmp.height, iw, imgH, focusOf(photo));
  ctx.drawImage(bmp, r.sx, r.sy, r.sw, r.sh, -w / 2 + pad, -h / 2 + pad, iw, imgH);
  bmp.close();
  ctx.restore();
}

// The 1080x1920 "পুজোর হিসেব" story card.
export async function renderStory(stats: PujoStats, lines: string[], heroes: Photo[]): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const { width: W, height: H } = EXPORT.story;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#6a0d12");
  bg.addColorStop(0.55, "#3d070b");
  bg.addColorStop(1, "#1c0405");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  paperGrain(ctx, W, H, "rgba(255, 210, 140, 0.04)", 3);
  ctx.globalAlpha = 0.12;
  alpona(ctx, W / 2, 470, 470, GOLD, 12);
  alpona(ctx, W / 2, 470, 300, GOLD, 8);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(54, 54, W - 108, H - 108);

  // Best photo in the middle, on top; the next two fanned out behind it.
  const left = { x: W / 2 - 250, y: 450, a: -0.16 };
  const right = { x: W / 2 + 250, y: 450, a: 0.15 };
  const middle = { x: W / 2, y: 420, a: -0.02 };
  const [best, second, third] = heroes;
  const layout: Array<[Photo, typeof left]> = [];
  if (second) layout.push([second, left]);
  if (third) layout.push([third, right]);
  if (best) layout.push([best, middle]);
  for (const [photo, s] of layout) await polaroid(ctx, photo, s.x, s.y, 330, s.a);

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = `92px "${FONT.display}"`;
  ctx.fillText("এবারের পুজোর হিসেব", W / 2, 810);

  ctx.fillStyle = CREAM;
  ctx.font = `210px "${FONT.serif}"`;
  ctx.fillText(`${bnNum(stats.total)}টা`, W / 2, 1020);
  ctx.font = `500 50px "${FONT.body}"`;
  ctx.fillStyle = "#e9cfb0";
  ctx.fillText("ছবি তুলেছ", W / 2, 1090);

  // Thakur vs nijer bar.
  const barX = 130;
  const barW = W - 260;
  const barY = 1150;
  const share = stats.total ? stats.thakur / stats.total : 0.5;
  roundRectPath(ctx, barX, barY, barW, 26, 13);
  ctx.fillStyle = "#f5ecda";
  ctx.fill();
  ctx.save();
  roundRectPath(ctx, barX, barY, barW, 26, 13);
  ctx.clip();
  ctx.fillStyle = GOLD;
  ctx.fillRect(barX, barY, barW * share, 26);
  ctx.restore();
  ctx.font = `600 34px "${FONT.body}"`;
  ctx.textAlign = "left";
  ctx.fillStyle = GOLD;
  ctx.fillText(`ঠাকুর ${bnNum(stats.thakur)}`, barX, barY + 76);
  ctx.textAlign = "right";
  ctx.fillStyle = "#f5ecda";
  ctx.fillText(`নিজেরা ${bnNum(stats.people)}`, barX + barW, barY + 76);

  // Roast chits.
  let y = 1300;
  ctx.textAlign = "left";
  for (const line of lines.slice(0, 4)) {
    ctx.font = `500 38px "${FONT.body}"`;
    const wrapped = wrapLines(ctx, line, W - 330);
    const h = 44 + wrapped.length * 52;
    if (y + h > H - 160) break;
    ctx.fillStyle = "rgba(251, 238, 219, 0.95)";
    roundRectPath(ctx, 110, y, W - 220, h, 22);
    ctx.fill();
    ctx.fillStyle = "#a3131b";
    ctx.beginPath();
    ctx.arc(150, y + h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a1712";
    wrapped.forEach((l, i) => ctx.fillText(l, 180, y + 60 + i * 52));
    y += h + 22;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#e9cfb0";
  ctx.font = `400 30px "${FONT.body}"`;
  ctx.fillText(`নিজের হিসেব বানাও: ${SITE.link}`, W / 2, H - 96);
  return c;
}
