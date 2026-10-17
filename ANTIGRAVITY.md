# Handoff: পুজোর ঝুলি, template studio (Part 2)

You are continuing work on this Vite + React 19 + TypeScript site. Read this whole file before you change anything. The owner speaks Bangla; all UI copy stays in Bangla.

## 1. What the site is

Visitors drop their Durga Puja photos. On-device analysis (`src/lib/analyze.ts`, `select.ts`) picks the best ones. The site then shows:

- a **template studio** (new, SCRL-style): the photos go into moodboard templates as an Instagram carousel or story
- a 9:16 "পুজোর হিসেব" story card
- Bangla captions

There is no server. Photos never leave the device.

Run it with `npm run dev`, which serves http://localhost:5190. To test without a file picker, run this in the browser console:

```js
await __pujoTest(["a01","a02","a03","a04","a05","a06","a07","a08","a09","a10","a11","a12","a13","a14","a15","a16","a17","a18","b01","b02","b03","c01","c02","c03","c04"].map(n => `/test-photos/set1/${n}.jpg`))
```

Dev-only art sheet: http://localhost:5190/?gallery (`src/dev/Gallery.tsx`).

## 2. Hard rules from the owner

1. **Do not draw moodboard art in code.** The owner tried code-drawn moodboards (`src/editor/paint.ts` and most of `src/editor/templates.ts`) and rejected them. Templates must be **image files** from the `moodboard/` folder. Code only places photos into their empty windows.
2. **Stickers are image files too** (PNG). Remove the code-drawn vector stickers.
3. **No copied artwork.** The owner does not want third-party (Pinterest) images used. Generate every template and sticker yourself with image generation (section 5), and save them into `moodboard/`.
4. **No emoji anywhere in the UI.** Icons are hand-made SVGs in `src/components/Icons.tsx`.
5. **Home page:**
   - The 3D prodip scene lives only inside the hero. It scrolls away with it and stops rendering once off screen.
   - Every section below the hero has a **solid** background colour: no gradients, nothing moving behind it.
   - This part is already done. Keep it that way.
6. **Do not touch the processing animation ("অগ্নিপরীক্ষা")**, `src/screens/Processing.tsx` and `src/three/*`. The owner will decide on it later.
7. Smoothness matters most:
   - Move things with transform/opacity only.
   - Avoid big `backdrop-filter` blurs and `background-attachment: fixed`.
   - Decode full-size photos only at export time.
8. Pin exact package versions (no `^` or `~`). Avoid new dependencies unless really needed.
9. No MP4 or reel export for now. The owner dropped it.

## 3. What already works (keep it)

| Part | File | Notes |
| --- | --- | --- |
| Data model | `src/editor/types.ts` | Project, Page, Fill (`zoom`, `cx`, `cy`), StickerItem, TextItem, Format (`post` 1080x1350, `story` 1080x1920) |
| Photo placement | `src/editor/geometry.ts` | `place()` = cover + zoom + centre, clamped. Shared by preview and export. |
| Build, autofill, undo | `src/editor/project.ts` | `buildProject()` makes the first carousel automatically from the AI's picks; `autofill()`; `withTemplate()`; `withFormat()`; `historyReducer` |
| Page preview | `src/editor/PageView.tsx` | Pure DOM, positions in %, text sized in `cqw`. Selection handles (delete, rotate/scale). |
| Studio UI | `src/editor/Studio.tsx`, `Panels.tsx`, `studio.css` | Full-screen editor. Phone: page strip + dock (টেমপ্লেট / ছবি / স্টিকার / লেখা) + bottom panel. Desktop (>=1024px): photos left, tools right. Drag, pinch, rotate handle, wheel zoom, undo/redo, keyboard shortcuts, page add/copy/move/delete. |
| Visitor's own photos | `analyzeExtra()` in `src/lib/analyze.ts` | "ফোন থেকে ছবি দাও" in the photo panel. Added photos get face detection and can go into any slot. |
| Sharp previews | `src/editor/photos.ts` | 1080px preview copies made on demand |
| Export | `src/editor/render.ts` (`renderPage`, `exportProject`), `ExportSheet.tsx` | Full-size JPEGs, then the phone share sheet or a ZIP via `src/lib/share.ts`. The site link goes on the first and last slide. |
| Results page | `src/screens/Results.tsx` | Tabs: টেমপ্লেট (preview strip + "এডিটরে খোলো" + "এখনই শেয়ার করো"), পুজোর হিসেব, ক্যাপশন |

Verified working:

- `npm run build` passes.
- On desktop and at 375px: auto-built carousel, sticker add, drag and rotate, photo pan, photo replace, export of 10 JPEGs at 1080x1350.

## 4. Remaining work, in order

### Task A: image-based templates (replaces the code-drawn ones)

1. Generate the template images (section 5.1) into `moodboard/templates/`:
   - Name each file `<id>__post.png` (exactly 1080x1350) and `<id>__story.png` (exactly 1080x1920).
   - Every **photo window** must be filled with flat pure magenta `#FF00FF`. If the image model's size is off, resize or crop to the exact size *before* detection.
2. Load them in the browser with `import.meta.glob("/moodboard/templates/*.png", { eager: true, query: "?url", import: "default" })`. Alternatively copy them to `public/templates/` and keep a small manifest.
3. At runtime, once per image (cache it), detect the windows and make the overlay:
   - Draw the image to a canvas and read its pixels.
   - Key out magenta. A pixel is "magenta-ish" if `r > 180 && b > 180 && g < 90` (tune this).
   - Find connected components on a downscaled mask, for example at quarter size. Drop components under about 1.5% of the image area.
   - Each remaining component's bounding box (scaled back up) becomes a slot.
   - Order the slots by area, largest first, and give the biggest one `role: "hero"`.
   - Build the **overlay**: the same image with the magenta pixels made transparent.
     - Use soft alpha at the edges: alpha follows how magenta the pixel is.
     - De-spill the fringe so no pink halo remains.
     - Save it as a PNG blob URL.
4. Rendering order, in both the preview (`PageView`) and the export (`renderPage`):
   1. photos, each filling its slot's bounding box with `place()`
   2. the overlay image on top. Its opaque parts hide anything outside the window, so arches, circles and frames shaped by the art work automatically, and decorations that overlap a window stay on top of the photo.
   3. stickers, then text.
   - Slot `<div>`s still receive taps (the overlay `<img>` has `pointer-events: none`).
5. Extend `TemplateDef` in `src/editor/types.ts` with an image kind, for example `{ kind: "image", id, name, src: { post?: string; story?: string } }`.
   - Slots come from detection, so `layout` becomes async-backed.
   - The simplest way: preload and cache every detection result before the studio opens, then return the cached slots synchronously from `layout()`.
6. Template panel:
   - Show only the templates that exist for the current format (পোস্ট ৪:৫ or স্টোরি ৯:১৬).
   - A carousel must use a single format for every page.
7. Delete **every** code-drawn template from `src/editor/templates.ts`, and their painters from `src/editor/paint.ts`:
   - Delete: `arch`, `lalpar`, `raat`, `padma`, `velvet`, `galicha`, `golapi`, `collage`, `maroon`, `shola`, `sara9`, `padma-pano`, `lalpar-pano`.
   - The owner does **not** want the old Part 1 frames (লাল পাড়, প্যান্ডেলের রাত) either. After this change, the only templates are the image ones from `moodboard/templates/`.
   - Delete `src/lib/render/slide.ts` (the old Part 1 carousel renderer) if nothing uses it any more. Keep `THEMES` only if `story.ts` still needs it.
8. Update `buildProject()` in `src/editor/project.ts` (currently `SINGLES`/`DOUBLES`, the grid page and the panorama):
   - The auto-built carousel must use only the image templates, grouped by how many windows each has.
   - Use the template with the most decorative cover look as page one.
   - If no template image exists yet, the টেমপ্লেট tab shows a short Bangla message instead of crashing.
9. Done when:
   - `npm run build` passes.
   - In the studio, tapping each window adds a photo, and the photo can be dragged and pinched.
   - Decorations that overlap a window stay above the photo.
   - The exported JPEG matches the preview.

### Task B: image stickers with drag and drop

1. Generate the stickers (section 5.2) into `moodboard/stickers/<id>.png`:
   - Square, 1024x1024.
   - Each sticker has its own white die-cut border, on a flat pure green `#00FF00` background.
2. Remove the background at runtime, or with a one-off Node script that writes transparent PNGs to `public/stickers/`:
   - Flood-fill from the image edges only, so green inside a sticker (leaves) survives.
   - Use soft alpha on the edge and de-spill green.
   - Then trim to the content bounding box with about 12px padding.
3. Replace `src/editor/stickers.ts` and `StickerSvg.tsx` with an image sticker list built from the folder.
   - `StickerItem.kind` = file id.
   - The preview renders an `<img>`.
   - The export uses `ctx.drawImage`, keeping the image's aspect ratio. `size` = width in export px.
4. Add stickers by:
   - **drag and drop** from the sticker panel onto a page:
     - desktop: HTML5 drag with `dataTransfer` `text/x-sticker`, dropped at the cursor position (convert with the page rect: `x = (clientX - rect.left) / rect.width * W`)
     - phone: a pointer-based drag with a floating ghost image that follows the finger; release over a page to drop
   - **tap to add**, which keeps working
5. Keep the text-sticker presets in `Panels.tsx` (`TEXT_PRESETS`). Do not generate Bangla text as images: image models write Bangla badly.
6. Done when:
   - At least 20 clean stickers, with no green halo.
   - Drag and drop works on desktop and with touch at 375px.
   - Stickers export correctly.

### Task C: home page showcase

In `src/screens/Landing.tsx`, add two small sections below "তিন ধাপ, মিনিটখানেক":

- **টেমপ্লেট:** a horizontal scroll of template previews. Fill the windows with a neutral placeholder, not real photos.
- **স্টিকারের ঝুলি:** a small sticker wall.

Both use solid section backgrounds (`.band` / `.band-dark` in `src/styles.css`) and the `.ornament` divider. Reveal each section once with a clip-path or mask wipe (transform, opacity and clip-path only). Also update step ৩'s text so it mentions templates and stickers.

### Task D: final checks

- `npm run build` passes, and `npx tsc --noEmit` shows no warnings.
- Check the full flow at 375px wide and on desktop: landing, `__pujoTest`, results, studio, export.
- The hero 3D stops rendering after scrolling past the hero (`useRunning` in `src/three/Scene.tsx`).
- Update `README.md` (it is in Bangla): describe the template studio, the `moodboard/` folder, and how to add a new template or sticker.

## 5. Image generation prompts

### 5.1 Templates

Generate each design twice: 1080x1350 (`__post`) and 1080x1920 (`__story`). Add this line to every prompt:

> Photo windows are filled with perfectly flat solid pure magenta #FF00FF, hard clean edges, no texture, no gradient, no text inside. No words or letters anywhere in the image. Original artwork, scrapbook/moodboard style, rich detail, high resolution.

| id | Prompt |
| --- | --- |
| `sage-collage` | Durga Puja scrapbook moodboard on sage-green textured paper. In the centre, an ornate cream lace-paper frame with one tall rectangular photo window. Around it, cut-out illustrations: a Bengali dhak drum with white feather plume, gold jhumka earrings, a pink lotus, stacked bangles, a gold alpona mandala, terracotta temple domes, a plate of jalebi. Soft paper shadows. |
| `lotus-pond` | Dark emerald background. The left third is Indian-miniature-style lotus flowers, buds and leaves with fine gold outlines and tiny gold sprigs. On the right, two stacked rectangular photo windows with thin gold borders, and small gold lotus dividers above, between and below them. |
| `maroon-scrapbook` | Deep red-to-magenta background. One landscape photo window framed by a colourful Indian block-print patchwork border. Lower right, a portrait photo window on aged paper with a hand-painted floral border. Scattered illustrated stickers: a mehndi hand, silver jhumkas, a pink lotus, a hibiscus, a pink bow, a gold four-point star. |
| `pink-blockprint` | Pink Indian block-print patchwork textile background. Two large offset rectangular photo windows, one top-right and one bottom-left. A colourful folk-art camera illustration top-left and a painted gramophone bottom-right, each partly overlapping a window. |
| `now-playing` | Maroon velvet background. One large rounded photo window in the upper part. Below it, a torn beige paper card showing a music player (heart icon, progress bar, shuffle, previous, pause, next, repeat). Cream flowers in the top corners, jasmine in a terracotta bowl, a mehndi hand with red alta, glass bangles. |
| `carpet` | A patchwork of Mughal-style carpet and textile blocks (mihrab arches, medallions) in maroon, ochre and green. One tall rectangular photo window in the middle. A pink lotus cluster bottom-right and a mehndi hand bottom-left, each overlapping the window edge. |
| `alpona-arch` | Off-white paper background. A large red temple-doorway arch made of teardrop alpona petals with a white dotted inner band. The inside of the arch is the photo window. Small red alpona rosettes in the corners, with empty space below the arch for a caption. |
| `shola-frame` | Deep red background with a white Bengali folk floral vine border (Shola-pith style, little daisies, leaves and curls), and a rope-like white inner border around one large rounded-rectangle photo window. |
| `sara-grid` | Nine round photo windows in a 3x3 grid on alternating red and turmeric-yellow squares, each circle ringed with a red or dotted border, in the style of a Bengali sarachitra. Leave a band at the top for a title. |

After generating, open each file and check that the windows really are flat magenta and that nothing important sits inside them. Regenerate if not.

### 5.2 Stickers

Use this base prompt and replace `[X]` for each sticker:

> A single die-cut sticker of [X], Bengali Durga Puja theme, flat illustration with soft shading, thick clean white die-cut border, centred, on a perfectly flat solid pure #00FF00 green background, no text, no drop shadow on the background, 1024x1024.

Subjects:

- dhak drum with white feather plume
- conch shell (shankh)
- red hibiscus (joba)
- pink lotus
- clay prodip with flame
- terracotta dhunuchi with smoke
- kash flower stalks
- the three eyes of Maa Durga
- gold jhumka earring
- shakha-pola bangles
- sindoor box
- vintage radio (Mahalaya morning)
- gramophone
- vintage camera
- marigold
- shiuli (night jasmine) flowers
- butterfly
- paan leaf
- brass bell
- mehndi hand with red alta
- plate with diya and flowers
- jasmine garland
- mango leaves string

## 6. Notes

- Decided: the Part 1 frames (`lalpar`, `raat`) are removed. Only image templates remain.
- If a generated template has decorations covering most of a window, regenerate it rather than hand-masking it.
- Ask the owner in Bangla if something is unclear.
