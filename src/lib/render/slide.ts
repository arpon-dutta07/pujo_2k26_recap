import { EXPORT, SITE } from "../../config";
import { bnDate, bnTime } from "../bn";
import { dayLabel } from "../days";
import type { Photo } from "../types";
import {
  FONT,
  THEMES,
  alpona,
  coverRect,
  decodeForExport,
  ensureFonts,
  focusOf,
  paperGrain,
  roundRectPath,
  sareeBorder,
  type ThemeId,
} from "./draw";

export type SlideOptions = {
  theme: ThemeId;
  index: number;
  total: number;
  cover?: { title: string; subtitle: string };
};

const FRAME = { x: 84, y: 84, w: 912, h: 1012 };

// One 1080x1350 carousel slide (Instagram's 4:5 portrait).
export async function renderSlide(photo: Photo, opts: SlideOptions): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const t = THEMES[opts.theme];
  const { width: W, height: H } = EXPORT.slide;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = t.paper;
  ctx.fillRect(0, 0, W, H);
  paperGrain(ctx, W, H, t.grain, photo.index + 11);
  sareeBorder(ctx, W, H, t);

  // Photo, cropped around the faces.
  const bmp = await decodeForExport(photo);
  const r = coverRect(bmp.width, bmp.height, FRAME.w, FRAME.h, focusOf(photo));
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRectPath(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 10);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 10);
  ctx.clip();
  ctx.drawImage(bmp, r.sx, r.sy, r.sw, r.sh, FRAME.x, FRAME.y, FRAME.w, FRAME.h);
  bmp.close();

  if (opts.cover) {
    const g = ctx.createLinearGradient(0, FRAME.y + FRAME.h * 0.45, 0, FRAME.y + FRAME.h);
    g.addColorStop(0, "rgba(20,8,5,0)");
    g.addColorStop(1, "rgba(20,8,5,0.82)");
    ctx.fillStyle = g;
    ctx.fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff4dc";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 18;
    ctx.font = `150px "${FONT.display}"`;
    ctx.fillText(opts.cover.title, W / 2, FRAME.y + FRAME.h - 150);
    ctx.font = `600 46px "${FONT.body}"`;
    ctx.fillStyle = "#f2c46d";
    ctx.fillText(opts.cover.subtitle, W / 2, FRAME.y + FRAME.h - 72);
  }
  ctx.restore();

  ctx.strokeStyle = t.line;
  ctx.lineWidth = 2;
  roundRectPath(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 10);
  ctx.stroke();

  // Caption strip: day on the left, time and date on the right.
  const baseY = 1208;
  const label = dayLabel(photo.day);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = t.accent;
  ctx.font = `86px "${FONT.display}"`;
  ctx.fillText(opts.cover ? "শুভ শারদীয়া" : label ?? "পুজো", FRAME.x + 4, baseY + 22);

  ctx.textAlign = "right";
  if (photo.fromExif && photo.takenAt && !opts.cover) {
    ctx.fillStyle = t.text;
    ctx.font = `600 40px "${FONT.body}"`;
    ctx.fillText(bnTime(photo.takenAt), FRAME.x + FRAME.w, baseY - 10);
    ctx.fillStyle = t.sub;
    ctx.font = `400 34px "${FONT.body}"`;
    ctx.fillText(bnDate(photo.takenAt), FRAME.x + FRAME.w, baseY + 36);
  } else {
    alpona(ctx, FRAME.x + FRAME.w - 44, baseY, 40, t.accent);
  }

  // Small slide counter and the site link on the first and last slides.
  ctx.textAlign = "center";
  ctx.fillStyle = t.sub;
  ctx.font = `400 22px "${FONT.body}"`;
  const isEdge = opts.index === 0 || opts.index === opts.total - 1;
  if (isEdge) ctx.fillText(SITE.link, W / 2, H - 52);
  return c;
}
