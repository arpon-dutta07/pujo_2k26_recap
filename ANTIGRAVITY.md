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
3. **No copied artwork.** The owner does not want third-party (Pinterest) images used. Generate every template and sticker yourself with image generation (section 5), and save them into `moodboard/`. The images in `moodboard/references/` are style references only.
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

1. Generate the template images with the process in **section 5.1** (15 designs, flat beige or black windows, no magenta). Save the originals in `moodboard/templates/` as `<id>__story.png`, and `<id>__post.png` when a 4:5 version exists.
2. Write `scripts/make-templates.mjs`, run with `npm run templates`, using `sharp` (already in devDependencies). For every file in `moodboard/templates/`:
   1. Resize to exactly 1080x1920 (story) or 1080x1350 (post) with `fit: "cover"`.
   2. **Find the empty windows by flatness, not by colour:**
      - Work on a half-size greyscale copy and compute the local standard deviation in a 7x7 box.
      - Pixels with a deviation under about 5 are "flat".
      - Take connected components of the flat mask. Keep only components that are:
        - at least 1.5% of the image area
        - filling at least 80% of their bounding box
        - between 0.4 and 2.5 in aspect ratio
   3. Refine each window at full size: inside its bounding box, every pixel within a colour distance of about 22 from the window's median colour is a window pixel. Grow that mask by 2px and feather the edge by 1px.
   4. Write the **overlay**, which is the template with every window pixel transparent:
      - `public/templates/<id>__<format>.webp`, WebP with alpha, quality 85.
      - Do **not** ship 5 MB PNGs.
   5. Write a debug image to `moodboard/debug/<id>__<format>.png`: the boxes drawn and numbered. Open it and check each one.
   6. Write one index, `src/editor/templates.generated.json`. Each entry:
      ```json
      { "id": "...", "name": "<Bangla name>", "format": "story", "src": "/templates/<id>__story.webp", "w": 1080, "h": 1920, "slots": [{ "id": "s0", "x": 0, "y": 0, "w": 0, "h": 0 }] }
      ```
      - Sort the slots in reading order, top to bottom then left to right.
      - Mark the largest slot `"role": "hero"`.
      - Take the Bangla names from `moodboard/templates/names.json`.
   7. If the number of slots found differs from the design's intended count (section 5.1), print a warning:
      - Regenerate the image, or tune the thresholds.
      - As a last resort, hand-edit the slots in a `moodboard/templates/<id>__<format>.slots.json` override, which the script prefers when present.
3. The studio reads `templates.generated.json`, so no work is done at runtime. Photos fill each slot's bounding box. Tilted windows still look right, because the overlay's hole has the real tilted shape.
4. Rendering order, in both the preview (`PageView`) and the export (`renderPage`):
   1. photos, each filling its slot's bounding box with `place()`
   2. the overlay image on top. Its opaque parts hide anything outside the window, so arches, circles and frames shaped by the art work automatically, and decorations that overlap a window stay on top of the photo.
   3. stickers, then text.
   - Slot `<div>`s still receive taps (the overlay `<img>` has `pointer-events: none`).
5. Build `TemplateDef`s from `templates.generated.json` in `src/editor/templates.ts`. `layout()` simply returns the stored slots for that format, and `over` is the overlay image. The export loads the overlay with `createImageBitmap(await (await fetch(src)).blob())` and draws it after the photos.
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

### 5.1 Templates: 15 Bengali Durga Puja moodboards

**The look the owner wants:** see the 8 images in `moodboard/references/` (`style-01.webp` to `style-08.webp`).

- Rich photographic scrapbook collages about Bengali Durga Puja:
  - the Durga face
  - red and white laal paar saree
  - dhak, shiuli, kash, hibiscus, brass lamps
  - old Kolkata ink sketches, torn paper, washi tape, lace doilies, polaroids
- Warm golden light. A strong nostalgic, emotional feel.
- **Use them only as style references** (attach 1 or 2 of them to every generation). Never copy them and never ship them.

**How to generate (follow every step):**

1. Use the best image model you have, at the highest resolution it offers, in a vertical **9:16** aspect.
   - Attach `moodboard/references/style-0X.webp` as a style reference: 02, 03 or 04 for the light designs, 08 for the dark ones.
2. Every prompt = the **BASE** below + the design's own text + the **FRAME RULES** with that design's photo count and window colour.
3. Make 3 variations per design and keep the best one.
4. Reject an image if any of these is true, and regenerate it:
   - the number of empty frames is wrong
   - anything sits inside a frame (text such as "ছবি বসাও", a flower, an icon)
   - the window is not one flat colour
   - the Bangla text is misspelled
   - there is a watermark or logo
   - the frames are smaller than a third of the width
5. Save the keeper as `moodboard/templates/<id>__story.png`.
6. Optional, but good for Instagram carousels: ask the model for the same design recomposed in **4:5** with the same number of frames, and save it as `<id>__post.png`.
7. Put the Bangla names in `moodboard/templates/names.json`, for example `{ "kumartuli": "কুমোরটুলি" }`.
8. Run `npm run templates` (Task A) and look at every debug image in `moodboard/debug/`.

**BASE (start of every prompt):**

> Vertical 9:16 phone-story moodboard, ultra detailed, high resolution. A handmade scrapbook collage about Bengali Durga Puja in Kolkata: layered torn paper, aged vintage photo paper, washi tape, brass paper clips, wooden pegs, lace doilies, die-cut paper stickers with white borders, real props photographed from above, Bengali red-and-white laal paar saree textures, warm golden festive light, deep reds, cream, turmeric yellow and antique gold, soft realistic shadows. Nostalgic and emotional, the feeling of "pujo mane bari phera" (Pujo means coming home). Same visual quality and richness as the attached reference image, but a completely new composition.

**FRAME RULES (end of every prompt; fill in N and COLOUR):**

> The collage contains EXACTLY N empty photo frames for the viewer's own photos. The inside of every frame is one perfectly flat, solid, plain COLOUR: completely blank, with no texture, no stain, no gradient, no shadow, no text, no icon and no object inside. Decorations may touch a frame's border or overlap one small corner, but never the inside. Every frame is large (at least a third of the image width), roughly rectangular, upright or tilted no more than 6 degrees, and no two frames overlap. No watermark, logo, signature, app interface or brand name. Bengali text only where this prompt gives it, spelled exactly as given; no other text anywhere.

COLOUR = `warm beige #E6DCC8` for light designs, `matte black #121212` for night designs.

**The 15 designs:**

| # | id | Bangla name | Photos | Window | Design (goes between BASE and FRAME RULES) |
| --- | --- | --- | --- | --- | --- |
| 1 | `kumartuli` | কুমোরটুলি | 1 | beige | The idol-makers' lane. A workshop with unpainted grey clay Durga idols wrapped in straw, bamboo frames, clay pots of paint, brushes, a single warm bulb. One large deckle-edged vintage photo frame in the centre, about 70% of the width, held by two strips of brown washi tape. Around it: a sepia ink sketch of the Kumartuli lane, a clay hand of the goddess, a red and yellow paint palette, a torn Bengali calendar page. Bengali text on a small torn paper tag: "কুমোরটুলি". |
| 2 | `mahalaya` | মহালয়ার ভোর | 2 | beige | Mahalaya dawn, the start of Pujo. Soft misty pink and blue dawn light. A vintage wooden valve radio (no brand name) bottom-left, white shiuli flowers with orange stems scattered on dewy grass and a brass plate, kash flowers at the right edge, a clay prodip. Two empty frames: a tall polaroid top-left tilted slightly left with a wooden peg, and a deckle-edged photo middle-right tilted slightly right with washi tape. A torn paper note with the Bengali text "মহালয়া". |
| 3 | `kashban` | কাশবন | 3 | beige | Kash flowers under the autumn sky. Bright blue sky with white cotton clouds at the top, a field of white kash flowers across the bottom, an old steam train far away. Three empty polaroids hang from a jute string with wooden pegs across the middle, the string sagging gently (left frame tilted left, middle straight, right tilted right). Dried kash stalks and shiuli flowers taped near the frames. Bengali text on a torn paper strip at the bottom: "শরতের আকাশ". |
| 4 | `bonedi-bari` | বনেদি বাড়ির পুজো | 1 | beige | The family Pujo of an old aristocratic Kolkata house. A grand thakurdalan with white columns and arches, a crystal chandelier, the traditional ekchala Durga idol in silver-white shola decoration softly out of focus behind. One large antique gold frame with a rounded arch top in the centre, its inside blank. Brass lamps, red-bordered white saree drapes, marigold garlands on the columns. Bengali text on a small brass plate: "ঠাকুরদালান". |
| 5 | `anjali` | অষ্টমীর অঞ্জলি | 3 | beige | Ashtami morning flower offering. Brass kosha-kushi, red hibiscus, white flowers, bel leaves, incense smoke, a conch with red markings at the top. Three empty frames running diagonally from top-left to bottom-right: a frame with a red saree-print border, a lace doily frame, and a polaroid with tape. A woman's hands with red alta and white shankha and red pola bangles holding flowers (hands only) bottom-right. Bengali text on a torn tag: "অষ্টমীর অঞ্জলি". |
| 6 | `sandhi` | সন্ধিপুজোর প্রদীপ | 2 | black | Sandhi Puja, 108 lamps. A dark warm background, rows of small glowing clay diyas, lotus flowers on brass plates, smoke and golden bokeh. Two empty tall frames stacked on the right half, each with a thin gold border. Red hibiscus and white jasmine cascade down the left side, with a brass bell at the top-left. Bengali text in gold at the top: "সন্ধিপুজো". |
| 7 | `dhunuchi` | ধুনুচি নাচ | 4 | black | Dhunuchi dance on Navami night. Thick fragrant smoke, glowing embers in terracotta dhunuchis, dhakis with white feather plumes in silhouette, red pandal lights. On the right half, a vertical vintage film strip with 4 empty frames from top to bottom, with sprocket holes. On the left: a big dhak, a smoking dhunuchi, red hibiscus. Bengali text on a torn paper bottom-left: "ঢাকের তালে". |
| 8 | `pandal-night` | প্যান্ডেল হপিং | 5 | black | Pandal hopping across Kolkata at night. A glowing ornate pandal gate, crowds as soft silhouettes, a yellow vintage taxi, a street lamp, string lights, torn-paper collage pieces of night photos. Four empty polaroids hang on a rope with wooden pegs across the top half (alternating slight tilts), and one bigger polaroid sits lower right. Jasmine and hibiscus die-cut stickers in the corners, small white doodle sparkles. Bengali text on a torn tag: "ঠাকুর দেখা". |
| 9 | `bhog` | ভোগ আর মিষ্টি | 3 | beige | Pujo food. A top-down banana leaf with khichuri bhog, labra, beguni, payesh in a clay pot, rosogolla and sandesh on a brass plate, mishti doi in a terracotta bhaar, tea in a clay cup, phuchka in a corner. Three empty frames: a big polaroid top-centre and two deckle-edged photos lower left and lower right, each held by washi tape. Bengali text on a torn tag: "ভোগের থালা". |
| 10 | `laal-paar` | লাল পাড় | 2 | beige | The red-and-white laal paar saree. The background is folds of a white garad saree with a bold red border and small red motifs, an alta bottle, shankha-pola bangles, a small wooden sindoor box, jhumkas, a hand mirror. Two empty frames: a large one at the top whose border is printed like the red saree border, and a smaller one lower right, slightly tilted, on aged paper. Bengali text on a small torn tag: "লাল পাড়". |
| 11 | `sindoor-khela` | সিঁদুর খেলা | 3 | beige | Dashami sindoor khela. Clouds of red vermilion powder, a brass plate of sindoor, paan leaves, sweets, a conch, red hibiscus, red bangles, women's hands in red-bordered sarees applying sindoor (hands only). Three empty frames: a large one top-centre tilted slightly left, and two smaller ones side by side below. Vermilion fingerprint smudges on the frame borders only, never inside. Bengali text on a torn tag: "সিঁদুর খেলা". |
| 12 | `bisorjon` | বিসর্জন | 1 | beige | Bijoya Dashami at the Ganga ghat at dusk. An orange and purple sky, a faint ink sketch of Howrah Bridge, boats, floating lamps on the river, silhouettes carrying the idol, petals on the water. One large torn-paper frame in the centre (70% of the width) with a paper clip on top. Bengali text on a torn paper at the bottom: "আসছে বছর আবার হবে". |
| 13 | `old-kolkata` | পুরনো কলকাতা | 4 | beige | A nostalgic old Kolkata scrapbook. A sepia background of old Bengali newspaper clippings (small unreadable print is fine), postage stamps, a vintage tram, a pencil sketch of Victoria Memorial, an ink drawing of Howrah Bridge, a yellow Ambassador taxi, a clay tea cup, a fountain pen. Four empty frames in a loose 2x2 grid: a polaroid, a deckle-edged photo, a lace doily frame and a red-bordered frame, each slightly tilted with tape or a pin. Bengali text on a tram ticket: "কলকাতা". |
| 14 | `kalighat-pat` | কালীঘাট পট | 2 | beige | Kalighat patachitra folk painting. The background is a hand-painted Kalighat pat illustration with bold black brush outlines and flat colours: a stylised Durga face, a cat holding a fish, fish and flowers, on aged handmade paper. Two empty frames with a painted folk border (red, yellow, indigo): one tall frame on the left, one square frame lower right. Bengali text in folk lettering: "পটের দুগ্গা". |
| 15 | `alpona` | আলপনা আর শিউলি | 5 | beige | White rice-paste alpona on a red floor, seen from above. A terracotta-red floor with a large intricate white alpona (lotus motifs, conch, Lakshmi footprints), shiuli flowers, a brass ghot with mango leaves, small diyas. Five empty frames with rounded corners arranged like a flower around the centre: one in the middle and four around it, each with a thin white alpona-style border. Bengali text on a small torn tag at the bottom: "শুভ শারদীয়া". |

Mix check: 3 designs hold 1 photo, 4 hold 2, 4 hold 3, 2 hold 4 and 2 hold 5. Keep that spread if you replace any design.

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
