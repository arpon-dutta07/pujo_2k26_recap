# পুজোর ঝুলি: image prompts (stickers + moodboards)

For Antigravity (or any image model). Follow the steps exactly. The site turns the images into stickers and templates automatically, but only if these rules are kept.

---

## Part 1: Sticker sheets

**Style references** (attach one to every generation, never copy them):

- `moodboard/references/stickers-style-01.jpg` for **Style A**: illustrated die-cut stickers.
- `moodboard/references/stickers-style-02.jpg` for **Style B**: painted collage cut-outs.

### Steps

1. Build each prompt as **STYLE (A or B) + SHEET RULES + that sheet's 9 subjects**, in the order given. Style C sheets use **STYLE C + SHEET RULES C + 6 subjects**.
2. Generate it square, at the highest resolution available (2048x2048 if possible).
3. Reject the image and regenerate if any of these is true:
   - the count is not exactly 9 (6 for Style C)
   - two stickers touch or overlap
   - the background is not flat green
   - there is a watermark
   - any text is misspelled
4. Save it as `moodboard/stickers/<sheet id>.png`.
5. Add the sheet to `moodboard/stickers.json`. The `names` list is in reading order: left to right, top row first. Example:
   ```json
   { "s01-pujor-jinish": { "group": "পুজোর জিনিস", "names": ["শাঁখ", "ঘণ্টা", "পঞ্চপ্রদীপ", "ধুনুচি", "কোশাকুশি", "মঙ্গলঘট", "চামর", "সিঁদুর কৌটো", "প্রদীপের থালা"] } }
   ```
6. Run `npm run stickers`.
   - Open `moodboard/debug/stickers__<sheet id>.png`: you should see 9 magenta boxes (6 for Style C) with one sticker in each.
   - If two stickers were merged into one box, or one sticker was split across two, regenerate the sheet with more space between the stickers.
7. Run `npm run build`, then commit.

### STYLE A (illustrated die-cut, like stickers-style-01)

> A sheet of hand-illustrated Bengali Durga Puja stickers, warm gouache and watercolour look with soft shading and fine ink outlines, rich deep red, cream, antique gold, leaf green and marigold orange, each sticker with a thick clean cream-white die-cut border and a thin darker outline around that border, premium printed-sticker quality.

### STYLE B (collage cut-outs, like stickers-style-02)

> A sheet of painted collage cut-out elements for a Bengali Durga Puja scrapbook, realistic painted look with soft light, each element cleanly cut out along its own shape with a very thin white edge, no thick border.

### SHEET RULES (end of every sticker prompt)

> Exactly 9 separate stickers arranged in a loose 3 x 3 grid, each one complete and fully inside the image, with wide empty space between them (at least one tenth of the image width), no sticker touching or overlapping another. Background: perfectly flat solid pure green #00FF00 everywhere around and between the stickers, no gradient, no texture, no shadow on the background. No watermark, logo or signature. No text unless a sticker below asks for it; any text spelled exactly as given.

### The 12 sheets (108 stickers)

| Sheet id | Group (Bangla) | Style | The 9 subjects, in reading order |
| --- | --- | --- | --- |
| `s01-pujor-jinish` | পুজোর জিনিস | A | conch shell with red markings; brass temple bell; five-wick brass panchapradip lamp with flames; terracotta dhunuchi with curling smoke; brass kosha-kushi; clay mangal ghot with mango leaves and a red mark; white chamor fan with silver handle; open wooden sindoor box with red powder; brass plate with a diya and red and white flowers |
| `s02-phul-pata` | ফুল-পাতা | A | red hibiscus with two leaves; pink lotus in full bloom; sprig of white shiuli flowers with orange stems; bunch of orange marigolds; white kash flower stalks; three bel leaves on one stem; string of mango leaves; heart-shaped paan leaf; white tuberose (rajanigandha) stems |
| `s03-dhak-gaan` | ঢাক আর গান | A | Bengali dhak drum with a white feather plume and red tassels; pair of wooden dhak sticks crossed; bell-metal kanshor ghonta gong with striker; wooden harmonium; sitar; vintage valve radio; gramophone with a brass horn; old cassette tape; pair of tabla drums |
| `s04-shajgoj` | সাজগোজ | A | pair of gold jhumka earrings; white shakha and red pola bangles; gold nath nose ring with a chain; red bindi and a line of sindoor; small bottle of red alta with cotton; hand with mehndi and red alta tips; folded white saree with a red laal paar border; embroidered red juttis; brass hand mirror |
| `s05-khaoa-daoa` | খাওয়াদাওয়া | A | bowl of white rosogolla in syrup; sandesh pieces on a banana leaf; mishti doi in a terracotta bhaar; brass plate of khichuri bhog with labra and beguni; luchi with alur dom; plate of phuchka; kathi roll in paper; tea in a clay bhaar with steam; coil of orange jilipi |
| `s06-kolkata` | কলকাতা | A | yellow Ambassador taxi; Kolkata tram; Howrah Bridge; Victoria Memorial; old street gas lamp; round palm-leaf hand fan (taal pakha); red pillar post box (no logo); paan stall box with betel leaves; illuminated pandal gate |
| `s07-mayer-poribar` | মায়ের পরিবার | A | face of Maa Durga with the third eye, in Bengali folk-art style; little Ganesh with a mouse; Lakshmi with an owl; Saraswati with a veena and a swan; Kartik with a peacock; Durga's lion; white owl; white swan; peacock feather (all gentle, respectful folk-art illustrations) |
| `s08-lekha-english` | লেখা (English) | A | paper note "Pujo Vibes" with a small heart; red calligraphy "Durga Puja"; "Maa" in red script with a heart; paper note "Same Girl, Different Festive Era"; red brush stroke with "Good Energy Always"; kraft tag "Pandal Hopping"; red ribbon banner "Shubho Sharodiya"; torn paper "Asche Bochor Abar Hobe"; round badge "Dhaker Taale" |
| `s09-lekha-bangla` | বাংলা লেখা | A | red Bengali calligraphy, each on cream paper with a die-cut border, spelled exactly: "শুভ দুর্গাপুজা"; "শুভ শারদীয়া"; "আসছে বছর আবার হবে"; "দুগ্গা দুগ্গা"; "মা আসছেন"; "ঢাকের তালে"; "পুজোর গন্ধ"; "প্যান্ডেল হপিং"; "বিজয়ার শুভেচ্ছা" (check every letter; regenerate if one is wrong) |
| `s10-chhoto-shaj` | ছোট সাজ | A | red heart; gold outline heart; red ribbon bow; single white jasmine flower; gold four-point sparkle star; strip of washi tape with red block print; brass paper clip; blank torn paper note; postage stamp with a lotus |
| `s11-collage-1` | কোলাজ | B | mehndi hand holding a pink lotus; white dove in flight; sitar; ornate gold hand mirror; white swan figurine; pair of embroidered juttis; gramophone; cluster of pink lotuses with leaves; gold wax seal with a heart |
| `s12-collage-2` | কোলাজ | B | hand with red alta and bangles holding flowers; brass diya with a flame; terracotta Bankura horse; vintage film camera; old pocket watch; ornate brass key; fountain pen with an ink bottle; envelope with a red wax seal; stack of old books with jasmine on top |

### STYLE C (ornate folk-art, like the first 8 stickers)

Style references: attach `public/stickers/shankh.webp`, `radio.webp`, `durga_eyes.webp` and `prodip.webp` (the first stickers Antigravity made). Use them for the look only; never copy them. Style C sheets have **6 stickers**, not 9, so each one keeps that much detail.

> A sheet of ornate Bengali Durga Puja stickers in a rich folk-art style inspired by Bengal patachitra and Kalighat painting: highly detailed hand-painted illustration with intricate decorative patterns painted on every surface (alpona dots, paisley, lotus petals, tiny floral borders, small trident and third-eye motifs), vivid vermilion red, deep maroon, turquoise, mustard yellow and antique gold with fine gold linework, cream highlights, soft painterly shading and a gentle glossy shine. Small accent elements (tiny flowers, leaves, curls of smoke, a little alpona base) may sit close around the main object but stay inside the same sticker outline. Every sticker has one thick, clean pure-white die-cut border following its whole silhouette, with a very thin soft grey line around that border. Premium glossy vinyl sticker quality, front-facing, each sticker large and centred in its own space.

### SHEET RULES C (end of every Style C prompt)

> Exactly 6 separate stickers in a 3 x 2 grid (3 across, 2 down), each one complete and fully inside the image, with wide empty space between them and around the edges (at least one tenth of the image width), no sticker touching or overlapping another. Background: perfectly flat solid pure green #00FF00 everywhere around and between the stickers, no gradient, no texture, no shadow on the background. Do not use bright green inside the stickers; leaves and other green parts are deep olive or dark green. No watermark, logo or signature. No text anywhere unless a sticker below asks for it.

### Sheets 13-18 (Style C, 36 stickers)

| Sheet id | Group (Bangla) | The 6 subjects, in reading order |
| --- | --- | --- |
| `s13-thakurer-shaj` | ঠাকুরের সাজ | white shola-pith crown (mukut) of Maa Durga with gold and red details; trishul decorated with a red and gold ribbon and a small bell; golden chakra with ornate spokes; curved khadga sword with a jewelled hilt; garland of red hibiscus (joba) in a loop; pair of small alta-red footprints with a lotus between them, alpona style |
| `s14-pandal` | প্যান্ডেল | illuminated pandal facade with tiny glowing bulbs; hanging Bengali paper lantern with tassels; swag of glowing fairy-light bulbs; dhaki in a white dhoti playing a dhak with a feather plume (gentle folk-art figure); woman in a red-bordered white saree dancing with a smoking dhunuchi (gentle folk-art figure); crystal chandelier (jhar) with candles |
| `s15-mela` | পুজোর মেলা | wooden nagordola ferris wheel with little cabins; bunch of colourful balloons; pink cotton candy on a stick; paper pinwheel on a stick; toy cap gun with a red roll of caps; Krishnanagar clay doll of a Bengali woman in a red-bordered saree |
| `s16-bonedi-bari` | বনেদি বাড়ি | thakur dalan: three carved arches on pillars of an old Bengali mansion; antique pendulum wall clock; carved wooden easy chair; old Kolkata window with coloured stained glass and dark wooden shutters; silver paan-dan box with filigree; old brass hurricane lantern with a flame |
| `s17-nakshha` | নকশা | round alpona mandala in red and white; paisley (kalka) motif in red and gold; pair of ornate fish facing each other; sun face in patachitra style; ornate L-shaped corner ornament for a photo corner; long horizontal ornate border strip with a lotus in the centre |
| `s18-lekha` | লেখা | red Bengali calligraphy, spelled exactly letter for letter: "জয় মা দুর্গা" on a red and gold ribbon banner; "দুগ্গা দুগ্গা" on a round ornate badge; "মা আসছেন" on a cream paper scroll; "আসছে বছর আবার হবে" on torn cream paper with an alpona corner; "ঢাকের তালে" with two small crossed dhak sticks; "শুভ দুর্গাপুজো" inside an ornate gold frame (regenerate if any letter is wrong) |

The sheets above that are not made yet (s04 to s12) can use Style C too: put the Style C text and SHEET RULES C in place of Style A, and pick 6 of their 9 subjects.

---

## Part 2: Moodboard templates (the busy scrapbook look; for the cleaner set see Part 3)

**Style references:** `moodboard/references/style-01.webp` to `style-08.webp` (and the 8 live templates in `moodboard/originals/`).

- Attach 02, 03 or 04 for the light designs.
- Attach 08 for the dark designs.

### Steps

1. Build each prompt as **BASE + the design text + FRAME RULES**, with that design's photo count and window colour filled in.
2. Generate in vertical **9:16** at the highest resolution. Make 3 variations and keep the best one.
3. Reject the image and regenerate if any of these is true:
   - the number of empty frames is wrong
   - anything sits inside a frame (words like "ছবি বসাও", a flower, an icon)
   - a frame's inside is not one flat colour
   - any Bangla text is misspelled
   - there is a watermark
4. Save it as `moodboard/originals/<id>__story.png`.
   - Optional: the same design recomposed in 4:5, saved as `<id>__post.png`.
5. Add it to `moodboard/templates.json`, for example: `"kumartuli": { "name": "কুমোরটুলি", "photos": 1 }`.
6. Run `npm run templates`.
   - It must print `ok <id>__story: N/N windows`.
   - Open `moodboard/debug/<id>__story.png`: every frame should be pink with a red box, and nothing else should be pink.
   - If a paper rim is left inside a frame, add `"tune": { "colour": 44, "reach": 14, "grow": 3 }` to that entry and run it again.
7. Add `"<id>__story"` to `VERIFIED` in `src/editor/templates.ts`. Then run `npm run build` and commit.

### BASE (start of every moodboard prompt)

> Vertical 9:16 phone-story moodboard, ultra detailed, high resolution. A handmade scrapbook collage about Bengali Durga Puja in Kolkata: layered torn paper, aged vintage photo paper, washi tape, brass paper clips, wooden pegs, lace doilies, die-cut paper stickers with white borders, real props photographed from above, Bengali red-and-white laal paar saree textures, warm golden festive light, deep reds, cream, turmeric yellow and antique gold, soft realistic shadows. Nostalgic and emotional, the feeling of "pujo mane bari phera" (Pujo means coming home). Same visual quality and richness as the attached reference image, but a completely new composition.

### FRAME RULES (end of every moodboard prompt; fill in N and COLOUR)

> The collage contains EXACTLY N empty photo frames for the viewer's own photos. The inside of every frame is one perfectly flat, solid, plain COLOUR: completely blank, with no texture, no stain, no gradient, no shadow, no text, no icon and no object inside. Decorations may touch a frame's border or overlap one small corner, but never the inside. Every frame is large (at least a third of the image width), roughly rectangular, upright or tilted no more than 10 degrees, and no two frames overlap. No watermark, logo, signature, app interface or brand name. Bengali text only where this prompt gives it, spelled exactly as given; no other text anywhere.

COLOUR = `warm beige #E6DCC8` for light designs, `matte black #121212` for night designs.

### Designs 1-15

The first 15 designs (কুমোরটুলি, মহালয়ার ভোর, কাশবন, বনেদি বাড়ির পুজো, অষ্টমীর অঞ্জলি, সন্ধিপুজোর প্রদীপ, ধুনুচি নাচ, প্যান্ডেল হপিং, ভোগ আর মিষ্টি, লাল পাড়, সিঁদুর খেলা, বিসর্জন, পুরনো কলকাতা, কালীঘাট পট, আলপনা আর শিউলি) are in `ANTIGRAVITY.md`, section 5.1.

### Designs 16-35 (new)

| # | id | Bangla name | Photos | Window | Design (goes between BASE and FRAME RULES) |
| --- | --- | --- | --- | --- | --- |
| 16 | `alor-roshnai` | আলোর রোশনাই | 3 | black | Night of pandal light art: glowing LED gates, chandeliers, fairy-light tunnels and peacock light installations over a dark street, warm bokeh. Three empty frames stacked in a zigzag down the middle, each with a thin gold border and a small brass clip. Marigold strings hang at the top corners. Bengali text in gold at the bottom: "আলোর রোশনাই". |
| 17 | `thakur-boron` | ঠাকুর বরণ | 2 | beige | Married women doing boron on Dashami, shown only as hands and sarees: brass boron dala with a diya, paan leaves, sweets and sindoor, red-bordered white sarees, red bangles. Two empty frames: a tall one on the left with a red saree-print border, and a smaller polaroid lower right held by washi tape. Bengali text on a torn tag: "ঠাকুর বরণ". |
| 18 | `chhotobelar-pujo` | ছোটবেলার পুজো | 4 | beige | Childhood Pujo memories: a toy cap gun and paper caps, balloons, a giant wheel at a fair, cotton candy, a tin toy, new shoes in a box, a red ribbon. Four empty frames in a playful scattered 2x2, each a polaroid with a different coloured washi tape. Bengali text on a school-notebook scrap: "ছোটবেলার পুজো". |
| 19 | `pujor-kenakata` | পুজোর কেনাকাটা | 3 | beige | Pujo shopping: paper shopping bags, new sarees folded in tissue, a kurta on a hanger, a shoe box, price tags, a handwritten shopping list (unreadable), a tailor's measuring tape. Three empty frames: a big one top-centre and two below, each like a price-tagged photo card. Bengali text on a price tag: "পুজোর কেনাকাটা". |
| 20 | `mahishasuramardini` | মহিষাসুরমর্দিনী | 1 | black | Dramatic dawn of Mahalaya: a grand silhouette of Maa Durga on her lion with weapons raised (respectful, painterly, no gore), rays of golden light through clouds, a vintage radio glowing in a corner. One large ornate gold frame in the centre. Bengali text in gold calligraphy at the top: "মহিষাসুরমর্দিনী". |
| 21 | `ghater-sondhya` | ঘাটের সন্ধ্যা | 2 | black | Evening aarti at a Ganga ghat: big brass lamps with flames, priests' raised hands in silhouette, smoke, floating diyas and marigolds on the dark river, a faint Howrah Bridge sketch. Two empty frames stacked on the right half with thin gold borders. Bengali text on a torn paper: "ঘাটের সন্ধ্যা". |
| 22 | `pujabarshiki` | পুজোবার্ষিকী | 3 | beige | The Pujo-annual magazines: a stack of colourful Bengali Sharodiya magazine covers (no real brand names, small unreadable print), reading glasses, a cup of tea, a bookmark, a desk lamp. Three empty frames placed like magazine pages, one large and two smaller, each with a paper clip. Bengali text on the top magazine cover: "শারদীয়া". |
| 23 | `pujor-adda` | পুজোর আড্ডা | 4 | beige | Para adda: tea in clay bhaars, telebhaja in newspaper cones, a carrom board corner, a transistor radio, a plastic chair, friends' hands raising cups (hands only). Four empty frames in a 2x2 grid like snapshots pinned to a cork board with pins. Bengali text on a torn tag: "পুজোর আড্ডা". |
| 24 | `nabamir-raat` | নবমীর রাত | 2 | black | The bittersweet night before Dashami: an empty pandal at 2 am, string lights, a last dhunuchi smoke, a sleepy dhaki in silhouette, petals on the floor. Two empty frames: a tall polaroid left (tilted slightly left) and another right (tilted slightly right), on a rope with pegs. Bengali text on a torn paper: "নবমীর রাত". |
| 25 | `chokkhudan` | চক্ষুদান | 1 | beige | Chokkhu daan, the eye-painting ritual: an artist's hand with a fine brush painting the eyes of a clay Durga idol (the idol's face to one side), paint bowls, brushes, straw. One large deckle-edged frame in the centre with a brass clip. Bengali text on a small torn tag: "চক্ষুদান". |
| 26 | `shiuli-bhor` | শিউলি ভোর | 3 | beige | Dawn under a shiuli tree: a carpet of fallen shiuli flowers on wet grass, dew drops, soft pink morning light, a brass plate collecting flowers, a sparrow. Three empty frames hanging from a branch with jute string. Bengali text on a torn paper strip: "শিউলি ভোর". |
| 27 | `theme-pandal` | থিম প্যান্ডেল | 4 | black | Modern theme pandals at night: terracotta panels, jute and bamboo art walls, a giant clay lantern, sculpted faces, dramatic coloured lights. Four empty frames in a staggered vertical column, each framed like a gallery exhibit with a small brass plaque (no text on the plaques). Bengali text on a torn tag: "থিম প্যান্ডেল". |
| 28 | `pujor-gaan` | পুজোর গান | 2 | beige | Pujo songs: vinyl records in paper sleeves, a gramophone, cassette tapes, a songbook, musical notes drawn in ink, a harmonium corner. Two empty frames shaped like square record sleeves, one large top-left and one smaller lower right. Bengali text on a record label: "পুজোর গান". |
| 29 | `kojagori` | কোজাগরী লক্ষ্মী | 2 | beige | Kojagori Lakshmi Puja on the full-moon night after Dashami: white alpona with Lakshmi's footprints on a red floor, paddy sheaves, a brass ghot, an owl, the full moon in the corner, small diyas. Two empty frames with a white alpona border. Bengali text on a torn tag: "কোজাগরী". |
| 30 | `bijoya` | বিজয়ার মিষ্টিমুখ | 3 | beige | Bijoya greetings: a box of sweets, nimki and narkel naru on a plate, a handwritten greeting letter (unreadable), an envelope, elders' feet with alta and a child touching them for pranam (feet and hands only). Three empty frames, one big centre and two smaller corners, held with tape. Bengali text in red calligraphy: "শুভ বিজয়া". |
| 31 | `tramer-janla` | ট্রামের জানলা | 3 | beige | Inside an old Kolkata tram: wooden seats, a brass handrail, a conductor's ticket punch, tram tickets, and three big tram windows in a row along the side. The three windows are the empty frames; pandal lights blur outside the edges. Bengali text on a tram ticket: "ট্রামে পুজো". |
| 32 | `gramer-pujo` | গ্রামের পুজো | 4 | beige | Village Pujo in rural Bengal: a mud-and-thatch thakurdalan, paddy fields, a banyan tree, a pond with lotuses, a bullock-cart wheel, a clay idol in the open. Four empty frames on a hand-woven mat, each like an old photo with deckled edges. Bengali text on a torn paper: "গ্রামের পুজো". |
| 33 | `retro-cinema` | রেট্রো সিনেমা | 5 | black | A retro Bengali cinema-poster collage from the 1970s: film reels, a film clapperboard, cinema ticket stubs, bold red and yellow poster typography shapes (no readable words), a spotlight. Five empty frames as film-strip frames running diagonally across, with sprocket holes. Bengali text in poster lettering: "পুজোর ছবি". |
| 34 | `pujor-khobor` | পুজোর খবর | 4 | beige | A vintage Bengali newspaper front page about Pujo: columns of small unreadable print, a masthead area, decorative rules, coffee stain, folded edges, a pair of spectacles on top. Four empty photo boxes laid out like newspaper photos (one big lead photo, three smaller). Bengali headline in bold newspaper type: "পুজোর খবর". |
| 35 | `laal-sada-polaroid` | লাল-সাদা পোলারয়েড | 5 | beige | A red-and-white laal paar saree hung as a backdrop, with five empty polaroids clipped to two strings of fairy lights (three on the top string, two on the lower), jasmine garlands, a brass bell, hibiscus. Bengali text on a small torn tag: "পুজোর স্মৃতি". |

Photo-count mix across designs 16-35:

| Photos | Designs |
| --- | --- |
| 1 | 2 |
| 2 | 5 |
| 3 | 6 |
| 4 | 5 |
| 5 | 2 |

---

## Part 3: Minimal moodboards (styles A, B, D, E)

The owner found the Part 2 moodboards too crowded: so many props and stickers that the photos got lost. This set is the opposite: **photo first, calm background, two or three small decorations at most.** Use the Part 3 BASE and FRAME RULES below for these 12, not the Part 2 ones.

**Style references:** `moodboard/references/pujo-moodboard-styles-1.jpg` (A, B) and `pujo-moodboard-styles-2.jpg` (D, E). They are Pinterest examples: use them for the feel only, never copy a layout, element or photo. Ignore the music-player cards in them; no app screens in ours.

### Steps

Same as Part 2 (generate 9:16, 3 variations, keep the best, save as `moodboard/originals/<id>__story.png`, add to `moodboard/templates.json`, `npm run templates`, check the debug sheet, add to `VERIFIED`, build, commit), plus one more reason to reject an image:

- the plain background came out as one flat colour (the template script would mistake it for a photo frame), or there are more than three decorations.

### BASE-MINIMAL (start of every Part 3 prompt)

> Vertical 9:16 phone-story photo template for Bengali Durga Puja, clean, minimal and elegant, desi but modern, like a premium Instagram story template. Photo first: the empty photo frames are the hero and together cover at least 60 percent of the image. Everything else is calm, quiet background with generous empty space. At most three small decorations in the whole image, kept at the edges or corners. No clutter: no piles of stickers, no layered torn papers, no props crowding the frames, no lace, no washi tape unless the design below asks for it. Soft natural light, subtle realistic textures, high resolution.

### FRAME RULES-MINIMAL (end of every Part 3 prompt; fill in N)

> The template contains EXACTLY N empty photo frames for the viewer's own photos. The inside of every frame is one perfectly flat, solid, plain warm beige #E6DCC8: completely blank, with no texture, no gradient, no shadow, no text, no icon and nothing inside. Nothing overlaps the inside of a frame. Frames never overlap each other and are separated by clear gaps. Each frame is large, upright or tilted at most 6 degrees. The background is never one flat colour: it always shows a visible paper, fabric or velvet texture. No watermark, logo, signature, music player, app screen or brand name. Text only where this prompt gives it, spelled exactly as given; no other text anywhere.

### The 12 designs

| # | Style | id | Bangla name | Photos | Design (goes between BASE-MINIMAL and FRAME RULES-MINIMAL) |
| --- | --- | --- | --- | --- | --- |
| 1 | A | `padma` | পদ্ম | 2 | Background: warm ivory handmade paper with soft fibres. Two tall portrait frames with a thin white border and a soft shadow: the left one sits higher, the right one lower, together filling the middle of the image. One watercolour red lotus with two leaves painted in the bottom-left corner. Small red handwritten Bengali text at the top right: "শুভ শারদীয়া". |
| 2 | A | `shiuli-char` | শিউলি | 4 | Background: off-white cotton paper with a faint texture. Four equal portrait frames in a neat 2 x 2 grid with narrow even gaps, the grid filling the top three quarters of the image. Below the grid, one sprig of white shiuli flowers with orange stems lying sideways. No text. |
| 3 | A | `alpona-tin` | আলপনা | 3 | Background: soft cream paper. One wide landscape frame across the top and two portrait frames side by side below it, all with thin white borders. A fine red alpona corner pattern only in the top-left and bottom-right corners. Small red Bengali text centred at the very bottom: "জয় মা দুর্গা". |
| 4 | B | `khilan` | খিলান | 1 | Background: deep sindoor-red velvet with a soft sheen. One large arch-shaped frame in the centre, with a scalloped Bengal-temple arch top and straight sides, about two thirds of the image height, outlined by a single string of small white pearls. A small brass diya with a flame just below the arch. Small gold Bengali text near the bottom: "জয় মা দুর্গা". |
| 5 | B | `tin-khilan` | তিন খিলান | 3 | Background: deep maroon velvet. Three arch-shaped frames with rounded tops, each outlined by a string of small white pearls, in a staggered column: top left, middle right, bottom left. A small white line drawing of Maa Durga's eyes and third eye in the top-right corner is the only ornament. No text. |
| 6 | B | `ghontar-khilan` | দুই খিলান | 2 | Background: cream handmade paper with a faint red block-print border along the edges. Two tall arch-shaped frames with scalloped tops side by side in the middle, with thin gold outlines. Two small brass bells hang on red threads from the top edge, above the gap between the arches. No text. |
| 7 | D | `pujo-dump` | পুজো ডাম্প | 4 | Background: warm off-white paper. Four large frames in a tight 2 x 2 grid with thin even gaps, filling most of the image, with a slightly wider margin at the bottom. In that bottom margin, small red handwritten English text "pujo dump" with a tiny hand-drawn heart. |
| 8 | D | `pandal-hopping-grid` | প্যান্ডেল হপিং | 6 | Background: deep night-plum paper with a fine texture. Six frames in a tight grid, three rows of two, with thin even gaps, filling most of the image. At the top, small handwritten gold English text "pandal hopping" with two tiny star doodles. Nothing else. |
| 9 | D | `mosaic` | মোজাইক | 5 | Background: warm ivory paper. Five frames as a mosaic: one wide frame across the top, then two portrait frames side by side, then two more side by side, all with thin even gaps. A tiny cluster of red alpona dots in the bottom-right corner. Small red handwritten Bengali text in the bottom-left: "দুগ্গা দুগ্গা". |
| 10 | E | `film-roll` | ফিল্ম রোল | 4 | Background: cream textured paper. One vertical dark-brown 35 mm film strip runs from near the top to near the bottom, tilted about 5 degrees, with white sprocket holes along both sides and four photo frames inside it. One dried shiuli sprig in the bottom-right corner. No text. |
| 11 | E | `photo-booth` | ফটো বুথ | 3 | Background: warm sindoor-red paper with a soft texture. A white photo-booth print strip with three stacked frames, tilted about 4 degrees, in the centre, held at the top by a brass paper clip. Small gold handwritten Bengali text to the right of the strip near the bottom: "দুগ্গা দুগ্গা". |
| 12 | E | `dui-roll` | দুটো রোল | 6 | Background: deep plum velvet with a few tiny warm fairy-light bokeh dots near the top edge. Two vertical dark-brown film strips side by side, the left one set higher than the right, each with three photo frames and sprocket holes along its sides. No text. |

`moodboard/templates.json` entries, in this order:

```json
"padma": { "name": "পদ্ম", "photos": 2 },
"shiuli-char": { "name": "শিউলি", "photos": 4 },
"alpona-tin": { "name": "আলপনা", "photos": 3 },
"khilan": { "name": "খিলান", "photos": 1 },
"tin-khilan": { "name": "তিন খিলান", "photos": 3 },
"ghontar-khilan": { "name": "দুই খিলান", "photos": 2 },
"pujo-dump": { "name": "পুজো ডাম্প", "photos": 4 },
"pandal-hopping-grid": { "name": "প্যান্ডেল হপিং", "photos": 6 },
"mosaic": { "name": "মোজাইক", "photos": 5 },
"film-roll": { "name": "ফিল্ম রোল", "photos": 4 },
"photo-booth": { "name": "ফটো বুথ", "photos": 3 },
"dui-roll": { "name": "দুটো রোল", "photos": 6 }
```

Checks that matter most for this set:

- **Grids (7, 8, 9):** the gaps between frames must be visible in the debug sheet as separate red boxes. If two frames merge into one box, regenerate with wider gaps.
- **Arches (4, 5, 6):** the pink area must follow the arch top; the pearls and gold lines stay outside it.
- **Film strips (10, 11, 12):** the sprocket holes are too small to count as frames, which is fine. The count must still match.

## Part 4: 20 simple moodboards (owner's ChatGPT set, 2026-10-21)

Four each for 1, 2, 3, 4 and 5 photos, in `moodboard/prompts-simple-20.md`. Every prompt there is complete on its own (one paste, one image) and already carries the cutting rules learned on the earlier sets: flat beige windows, straight sharp edges (or a smooth round arch), nothing and no shadow crossing a window, even light with no leaf or sunlight patches (8 boards were set aside for exactly that). Save each keeper as `moodboard/originals/<id>__story.png`; the names and photo counts are already in `moodboard/templates.json`.
