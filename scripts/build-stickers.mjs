import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/arpan/.gemini/antigravity-ide/brain/544242b6-19ec-41b2-afc8-7d5456b848c8';
const outDir = 'public/stickers';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function processGreenSticker(inputPath, outputPath) {
  const img = sharp(inputPath);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Green detection: key out background
  const isGreen = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const idx = (y * width + x) * channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    return g > 115 && r < 120 && b < 120;
  };

  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed with border pixels
  for (let x = 0; x < width; x++) {
    if (isGreen(x, 0)) { queue.push(x, 0); visited[x] = 1; }
    if (isGreen(x, height - 1)) { queue.push(x, height - 1); visited[(height - 1) * width + x] = 1; }
  }
  for (let y = 0; y < height; y++) {
    if (isGreen(0, y) && !visited[y * width]) { queue.push(0, y); visited[y * width] = 1; }
    if (isGreen(width - 1, y) && !visited[y * width + width - 1]) { queue.push(width - 1, y); visited[y * width + width - 1] = 1; }
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const neighbors = [
      [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const npos = ny * width + nx;
        if (!visited[npos] && isGreen(nx, ny)) {
          visited[npos] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      const idx = pos * channels;
      if (visited[pos]) {
        data[idx + 3] = 0;
      } else {
        // Despill green fringe around die-cut border
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (g > r && g > b && r > 160 && b > 160) {
          data[idx + 1] = Math.round((r + b) / 2);
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = 10;
  const cropLeft = Math.max(0, minX - pad);
  const cropTop = Math.max(0, minY - pad);
  const cropWidth = Math.min(width - cropLeft, (maxX - minX) + pad * 2);
  const cropHeight = Math.min(height - cropTop, (maxY - minY) + pad * 2);

  await sharp(data, { raw: { width, height, channels } })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toFile(outputPath);

  console.log(`Saved sticker: ${outputPath}`);
}

async function main() {
  const files = fs.readdirSync(brainDir).filter(f => f.startsWith('sticker_') && f.endsWith('.jpg'));
  for (const f of files) {
    const id = f.replace(/^sticker_/, '').replace(/_\d+\.jpg$/, '');
    const inPath = path.join(brainDir, f);
    const outPath = path.join(outDir, `${id}.png`);
    await processGreenSticker(inPath, outPath);
  }
  console.log('All stickers processed!');
}

main().catch(console.error);
