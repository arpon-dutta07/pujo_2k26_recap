import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outTemplatesDir = 'public/templates';
const outMoodboardDir = 'moodboard/templates';

if (!fs.existsSync(outTemplatesDir)) fs.mkdirSync(outTemplatesDir, { recursive: true });
if (!fs.existsSync(outMoodboardDir)) fs.mkdirSync(outMoodboardDir, { recursive: true });

export const TEMPLATE_CONFIGS = [
  {
    id: 'agomoni',
    name: 'আগমনী সুর',
    src: 'public/Moodboard/Bengali Festive Scrapbook Collage.png',
    story: {
      w: 1080,
      h: 1920,
      slots: [
        { id: 'a', x: 125, y: 358, w: 412, h: 545, role: 'hero' },
        { id: 'b', x: 690, y: 1090, w: 309, h: 427, role: 'people' }
      ]
    },
    post: {
      w: 1080,
      h: 1350,
      slots: [
        { id: 'a', x: 110, y: 220, w: 430, h: 560, role: 'hero' },
        { id: 'b', x: 670, y: 780, w: 320, h: 430, role: 'people' }
      ]
    }
  },
  {
    id: 'photo-strip',
    name: 'পুজোর ফটোস্ট্রিপ',
    src: 'public/Moodboard/Bengali Festival Photo Strip Collage.png',
    story: {
      w: 1080,
      h: 1920,
      slots: [
        { id: 'a', x: 390, y: 212, w: 671, h: 484, role: 'hero' },
        { id: 'b', x: 390, y: 716, w: 671, h: 460, role: 'people' },
        { id: 'c', x: 390, y: 1200, w: 671, h: 458, role: 'thakur' }
      ]
    },
    post: {
      w: 1080,
      h: 1350,
      slots: [
        { id: 'a', x: 390, y: 130, w: 671, h: 360, role: 'hero' },
        { id: 'b', x: 390, y: 505, w: 671, h: 360, role: 'people' },
        { id: 'c', x: 390, y: 880, w: 671, h: 360, role: 'thakur' }
      ]
    }
  },
  {
    id: 'durga-memory',
    name: 'শারদ স্মৃতি',
    src: 'public/Moodboard/Bengali Durga Puja Memory Collage.png',
    story: {
      w: 1080,
      h: 1920,
      slots: [
        { id: 'a', x: 180, y: 200, w: 380, h: 490, role: 'hero' },
        { id: 'b', x: 580, y: 360, w: 410, h: 540, role: 'people' },
        { id: 'c', x: 170, y: 560, w: 370, h: 480, role: 'thakur' },
        { id: 'd', x: 570, y: 720, w: 400, h: 500, role: 'people' }
      ]
    },
    post: {
      w: 1080,
      h: 1350,
      slots: [
        { id: 'a', x: 160, y: 150, w: 370, h: 440, role: 'hero' },
        { id: 'b', x: 570, y: 270, w: 390, h: 460, role: 'people' },
        { id: 'c', x: 160, y: 460, w: 370, h: 430, role: 'thakur' },
        { id: 'd', x: 570, y: 590, w: 390, h: 440, role: 'people' }
      ]
    }
  },
  {
    id: 'golden-puja',
    name: 'সোনার প্রতিমা ও আলো',
    src: 'public/Moodboard/Golden Durga Puja Collage.png',
    story: {
      w: 1080,
      h: 1920,
      slots: [
        { id: 'a', x: 70, y: 760, w: 185, h: 205, role: 'hero' },
        { id: 'b', x: 300, y: 745, w: 190, h: 205, role: 'people' },
        { id: 'c', x: 540, y: 680, w: 205, h: 215, role: 'thakur' },
        { id: 'd', x: 805, y: 580, w: 200, h: 215, role: 'people' }
      ]
    },
    post: {
      w: 1080,
      h: 1350,
      slots: [
        { id: 'a', x: 70, y: 535, w: 185, h: 205, role: 'hero' },
        { id: 'b', x: 300, y: 525, w: 190, h: 205, role: 'people' },
        { id: 'c', x: 540, y: 480, w: 205, h: 215, role: 'thakur' },
        { id: 'd', x: 805, y: 410, w: 200, h: 215, role: 'people' }
      ]
    }
  },
  {
    id: 'durga-scrapbook',
    name: 'শারদ কোলাজ',
    src: 'public/Moodboard/Durga Puja Scrapbook Collage Template.png',
    story: {
      w: 1080,
      h: 1920,
      slots: [
        { id: 'a', x: 170, y: 185, w: 410, h: 540, role: 'hero' },
        { id: 'b', x: 610, y: 275, w: 350, h: 460, role: 'people' },
        { id: 'c', x: 160, y: 580, w: 390, h: 480, role: 'thakur' },
        { id: 'd', x: 600, y: 700, w: 390, h: 510, role: 'people' }
      ]
    },
    post: {
      w: 1080,
      h: 1350,
      slots: [
        { id: 'a', x: 160, y: 130, w: 390, h: 450, role: 'hero' },
        { id: 'b', x: 600, y: 195, w: 340, h: 390, role: 'people' },
        { id: 'c', x: 150, y: 410, w: 380, h: 410, role: 'thakur' },
        { id: 'd', x: 590, y: 495, w: 380, h: 430, role: 'people' }
      ]
    }
  },
  {
    id: 'vintage-memory',
    name: 'ভিন্টেজ পুজো',
    src: 'public/Moodboard/Vintage Bengali Durga Puja Memory Collage.png',
    story: {
      w: 1080,
      h: 1920,
      slots: [
        { id: 'a', x: 180, y: 120, w: 410, h: 520, role: 'hero' },
        { id: 'b', x: 580, y: 350, w: 380, h: 500, role: 'people' },
        { id: 'c', x: 160, y: 620, w: 410, h: 440, role: 'thakur' },
        { id: 'd', x: 590, y: 720, w: 390, h: 540, role: 'people' }
      ]
    },
    post: {
      w: 1080,
      h: 1350,
      slots: [
        { id: 'a', x: 180, y: 90, w: 390, h: 430, role: 'hero' },
        { id: 'b', x: 570, y: 250, w: 370, h: 420, role: 'people' },
        { id: 'c', x: 160, y: 440, w: 390, h: 370, role: 'thakur' },
        { id: 'd', x: 580, y: 510, w: 380, h: 440, role: 'people' }
      ]
    }
  }
];

async function generateOverlay(srcPath, outPath, targetW, targetH, slots) {
  const base = sharp(srcPath).resize(targetW, targetH, { fit: 'fill' });
  const { data, info } = await base.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (const s of slots) {
    const minX = Math.max(0, Math.round(s.x));
    const maxX = Math.min(width, Math.round(s.x + s.w));
    const minY = Math.max(0, Math.round(s.y));
    const maxY = Math.min(height, Math.round(s.y + s.h));

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const idx = (y * width + x) * channels;
        data[idx + 3] = 0; // Transparent slot window
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outPath);
  console.log('Saved overlay:', outPath);
}

async function generateThumbnail(srcPath, outThumbPath) {
  await sharp(srcPath)
    .resize(360, 640, { fit: 'cover' })
    .png({ quality: 85 })
    .toFile(outThumbPath);
  console.log('Saved thumb:', outThumbPath);
}

async function main() {
  for (const t of TEMPLATE_CONFIGS) {
    console.log(`Processing template: ${t.id} (${t.name})`);
    
    // Story overlay (1080x1920)
    const storyOverlay = path.join(outTemplatesDir, `${t.id}__story.png`);
    await generateOverlay(t.src, storyOverlay, t.story.w, t.story.h, t.story.slots);
    fs.copyFileSync(storyOverlay, path.join(outMoodboardDir, `${t.id}__story.png`));

    // Post overlay (1080x1350)
    const postOverlay = path.join(outTemplatesDir, `${t.id}__post.png`);
    await generateOverlay(t.src, postOverlay, t.post.w, t.post.h, t.post.slots);
    fs.copyFileSync(postOverlay, path.join(outMoodboardDir, `${t.id}__post.png`));

    // Thumbnail
    const thumbPath = path.join(outTemplatesDir, `${t.id}__thumb.png`);
    await generateThumbnail(t.src, thumbPath);
  }
  console.log('All templates processed successfully!');
}

main().catch(console.error);
