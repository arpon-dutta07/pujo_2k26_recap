import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const IN_DIR = 'moodboard/templates';
const OUT_TEMPLATES = 'public/templates';
const DEBUG_DIR = 'moodboard/debug';
const NAMES_FILE = path.join(IN_DIR, 'names.json');
const OUT_INDEX = 'src/editor/templates.generated.json';

if (!fs.existsSync(OUT_TEMPLATES)) fs.mkdirSync(OUT_TEMPLATES, { recursive: true });
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

const names = fs.existsSync(NAMES_FILE) ? JSON.parse(fs.readFileSync(NAMES_FILE, 'utf-8')) : {};

// Expected photo count per design from ANTIGRAVITY.md Section 5.1
const EXPECTED_COUNTS = {
  'kumartuli': 1,
  'mahalaya': 2,
  'kashban': 3,
  'bonedi-bari': 1,
  'anjali': 3,
  'sandhi': 2,
  'dhunuchi': 4,
  'pandal-night': 5,
  'bhog': 3,
  'laal-paar': 2,
  'sindoor-khela': 3,
  'bisorjon': 1,
  'old-kolkata': 4,
  'kalighat-pat': 2,
  'alpona': 5,
  'agomoni': 2,
  'photo-strip': 3,
  'durga-memory': 4,
  'golden-puja': 4,
  'durga-scrapbook': 4,
  'vintage-memory': 4
};

function computeStats(buffer, width, height) {
  // Compute local standard deviation in 7x7 window
  // Using integral image for fast O(1) box sum
  const sum = new Float64Array((width + 1) * (height + 1));
  const sumSq = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    for (let x = 0; x < width; x++) {
      const val = buffer[y * width + x];
      rowSum += val;
      rowSumSq += val * val;
      const idx = (y + 1) * (width + 1) + (x + 1);
      const above = y * (width + 1) + (x + 1);
      sum[idx] = sum[above] + rowSum;
      sumSq[idx] = sumSq[above] + rowSumSq;
    }
  }

  const radius = 3;
  const flatMask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width, x + radius + 1);
      const count = (y1 - y0) * (x1 - x0);

      const iA = y0 * (width + 1) + x0;
      const iB = y0 * (width + 1) + x1;
      const iC = y1 * (width + 1) + x0;
      const iD = y1 * (width + 1) + x1;

      const total = sum[iD] - sum[iB] - sum[iC] + sum[iA];
      const totalSq = sumSq[iD] - sumSq[iB] - sumSq[iC] + sumSq[iA];

      const mean = total / count;
      const variance = Math.max(0, (totalSq / count) - (mean * mean));
      const stdDev = Math.sqrt(variance);

      if (stdDev < 6.5) {
        flatMask[y * width + x] = 1;
      }
    }
  }

  return flatMask;
}

function findComponents(mask, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  const minPixels = Math.round(width * height * 0.015); // >= 1.5%

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (!mask[pos] || visited[pos]) continue;

      let minX = x, maxX = x, minY = y, maxY = y;
      let count = 0;
      const q = [x, y];
      visited[pos] = 1;

      let head = 0;
      while (head < q.length) {
        const cx = q[head++];
        const cy = q[head++];
        count++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const npos = ny * width + nx;
            if (mask[npos] && !visited[npos]) {
              visited[npos] = 1;
              q.push(nx, ny);
            }
          }
        }
      }

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const boxArea = boxW * boxH;
      const fillRatio = count / boxArea;
      const aspect = boxW / boxH;

      if (count >= minPixels && fillRatio >= 0.72 && aspect >= 0.35 && aspect <= 2.8) {
        components.push({ minX, minY, maxX, maxY, boxW, boxH, count, fillRatio });
      }
    }
  }

  return components;
}

async function processTemplate(filePath) {
  const filename = path.basename(filePath);
  const match = filename.match(/^([a-zA-Z0-9_-]+)__(story|post)\.(png|jpg|webp)$/i);
  if (!match) return null;

  const [, id, format] = match;
  const targetW = 1080;
  const targetH = format === 'story' ? 1920 : 1350;

  // Check for .slots.json override
  const overridePath = path.join(IN_DIR, `${id}__${format}.slots.json`);
  let slots = [];

  if (fs.existsSync(overridePath)) {
    console.log(`Using slot override for ${id}__${format}`);
    slots = JSON.parse(fs.readFileSync(overridePath, 'utf-8'));
  } else {
    // Resize to target dimensions
    const baseImg = sharp(filePath).resize(targetW, targetH, { fit: 'cover' });
    const { data: fullRgb, info: fullInfo } = await baseImg.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // Half size greyscale for flatness detection
    const halfW = Math.round(targetW / 2);
    const halfH = Math.round(targetH / 2);
    const halfGrey = await sharp(fullRgb, { raw: { width: targetW, height: targetH, channels: 4 } })
      .resize(halfW, halfH)
      .greyscale()
      .raw()
      .toBuffer();

    const flatMask = computeStats(halfGrey, halfW, halfH);
    const comps = findComponents(flatMask, halfW, halfH);

    // Scale comps back to full size
    for (const c of comps) {
      slots.push({
        x: Math.round(c.minX * 2),
        y: Math.round(c.minY * 2),
        w: Math.round(c.boxW * 2),
        h: Math.round(c.boxH * 2)
      });
    }
  }

  // Refine full-size mask and make overlay
  const baseImg = sharp(filePath).resize(targetW, targetH, { fit: 'cover' });
  const { data: fullRgba } = await baseImg.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (const s of slots) {
    const minX = Math.max(0, s.x);
    const maxX = Math.min(targetW, s.x + s.w);
    const minY = Math.max(0, s.y);
    const maxY = Math.min(targetH, s.y + s.h);

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const idx = (y * targetW + x) * 4;
        fullRgba[idx + 3] = 0; // Transparent slot window
      }
    }
  }

  // Write WebP overlay with alpha
  const overlayWebp = path.join(OUT_TEMPLATES, `${id}__${format}.webp`);
  await sharp(fullRgba, { raw: { width: targetW, height: targetH, channels: 4 } })
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(overlayWebp);

  // Write debug PNG
  const debugData = Buffer.from(fullRgba);
  // Restore opacity for debug image and draw borders
  for (let i = 3; i < debugData.length; i += 4) {
    debugData[i] = 255;
  }
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const minX = Math.max(0, s.x);
    const maxX = Math.min(targetW - 1, s.x + s.w);
    const minY = Math.max(0, s.y);
    const maxY = Math.min(targetH - 1, s.y + s.h);

    for (let x = minX; x <= maxX; x++) {
      for (const y of [minY, maxY]) {
        for (let dy = -2; dy <= 2; dy++) {
          const py = Math.min(targetH - 1, Math.max(0, y + dy));
          const idx = (py * targetW + x) * 4;
          debugData[idx] = 255; debugData[idx + 1] = 0; debugData[idx + 2] = 0;
        }
      }
    }
    for (let y = minY; y <= maxY; y++) {
      for (const x of [minX, maxX]) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = Math.min(targetW - 1, Math.max(0, x + dx));
          const idx = (y * targetW + px) * 4;
          debugData[idx] = 255; debugData[idx + 1] = 0; debugData[idx + 2] = 0;
        }
      }
    }
  }

  const debugPng = path.join(DEBUG_DIR, `${id}__${format}.png`);
  await sharp(debugData, { raw: { width: targetW, height: targetH, channels: 4 } })
    .png()
    .toFile(debugPng);

  // Sort slots in reading order: top-to-bottom, then left-to-right
  slots.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 80) return a.y - b.y;
    return a.x - b.x;
  });

  // Find largest slot as hero
  let maxArea = 0, heroIdx = 0;
  slots.forEach((s, i) => {
    const area = s.w * s.h;
    if (area > maxArea) {
      maxArea = area;
      heroIdx = i;
    }
  });

  const formattedSlots = slots.map((s, i) => ({
    id: `s${i}`,
    x: s.x,
    y: s.y,
    w: s.w,
    h: s.h,
    role: i === heroIdx ? 'hero' : (s.role || 'people')
  }));

  const expected = EXPECTED_COUNTS[id];
  if (expected && formattedSlots.length !== expected) {
    console.warn(`[WARN] ${id}__${format}: found ${formattedSlots.length} slots, expected ${expected}`);
  }

  return {
    id,
    name: names[id] || id,
    format,
    src: `/templates/${id}__${format}.webp`,
    w: targetW,
    h: targetH,
    slots: formattedSlots
  };
}

async function main() {
  console.log('--- Generating templates ---');
  const files = fs.readdirSync(IN_DIR).filter(f => f.includes('__'));
  const results = [];

  for (const f of files) {
    const fullPath = path.join(IN_DIR, f);
    if (f.endsWith('.slots.json') || f.endsWith('.json')) continue;
    try {
      const res = await processTemplate(fullPath);
      if (res) results.push(res);
    } catch (err) {
      console.error(`Error processing ${f}:`, err);
    }
  }

  fs.writeFileSync(OUT_INDEX, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Generated ${results.length} templates into ${OUT_INDEX}`);
}

main().catch(console.error);
