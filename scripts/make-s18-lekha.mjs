import sharp from "sharp";
import fs from "fs";

// Load fonts as base64
const galadaWoff = fs.readFileSync("node_modules/@fontsource/galada/files/galada-bengali-400-normal.woff").toString("base64");
const hindWoff = fs.readFileSync("node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-700-normal.woff").toString("base64");

const svg = `
<svg width="2048" height="2048" viewBox="0 0 2048 2048" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Galada';
        src: url('data:font/woff;base64,${galadaWoff}') format('woff');
      }
      @font-face {
        font-family: 'Hind Siliguri';
        font-weight: 700;
        src: url('data:font/woff;base64,${hindWoff}') format('woff');
      }
      .txt-galada {
        font-family: 'Galada', 'Hind Siliguri', serif;
        text-anchor: middle;
        dominant-baseline: central;
      }
      .txt-hind {
        font-family: 'Hind Siliguri', sans-serif;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: central;
      }
      .die-cut {
        fill: #ffffff;
        stroke: #e0e0e0;
        stroke-width: 6;
        stroke-linejoin: round;
      }
    </style>
    <!-- Filter for soft realistic drop shadow under details inside stickers -->
    <filter id="sticker-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#550000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background pure green #00FF00 -->
  <rect width="2048" height="2048" fill="#00FF00"/>

  <!-- ==================== STICKER 1: জয় মা দুর্গা on red & gold ribbon ==================== -->
  <!-- Centred at (341, 520) -->
  <g transform="translate(341, 500)">
    <!-- White die cut base -->
    <path class="die-cut" d="
      M -260,-90
      C -260,-120 -230,-120 -180,-115
      L 180,-115
      C 230,-120 260,-120 260,-90
      L 270,40
      L 290,110
      L 240,85
      L 190,110
      L 200,60
      C 150,75 50,85 0,85
      C -50,85 -150,75 -200,60
      L -190,110
      L -240,85
      L -290,110
      L -270,40
      Z
    " />
    
    <!-- Ribbon tails -->
    <path d="M -240,-40 L -270,95 L -225,70 L -180,95 L -190,40 Z" fill="#801017" stroke="#ffd700" stroke-width="4"/>
    <path d="M 240,-40 L 270,95 L 225,70 L 180,95 L 190,40 Z" fill="#801017" stroke="#ffd700" stroke-width="4"/>

    <!-- Main Banner Body -->
    <path d="
      M -230,-75
      C -150,-90 150,-90 230,-75
      C 245,-40 245,20 230,45
      C 150,65 -150,65 -230,45
      C -245,20 -245,-40 -230,-75
      Z
    " fill="#a81822" stroke="#d4af37" stroke-width="8" filter="url(#sticker-shadow)"/>

    <!-- Inner gold border -->
    <path d="
      M -215,-65
      C -140,-78 140,-78 215,-65
      C 225,-35 225,15 215,35
      C 140,52 -140,52 -215,35
      C -225,15 -225,-35 -215,-65
      Z
    " fill="none" stroke="#fbe8a6" stroke-width="3" stroke-dasharray="6,4"/>

    <!-- Small gold trident at top -->
    <circle cx="0" cy="-60" r="6" fill="#ffd700"/>
    <circle cx="-20" cy="-62" r="4" fill="#ffd700"/>
    <circle cx="20" cy="-62" r="4" fill="#ffd700"/>

    <!-- Calligraphy Text -->
    <text x="0" y="-8" class="txt-galada" font-size="82" fill="#fff9e6">জয় মা দুর্গা</text>
  </g>

  <!-- ==================== STICKER 2: দুগ্গা দুগ্গা on round ornate badge ==================== -->
  <!-- Centred at (1024, 500) -->
  <g transform="translate(1024, 500)">
    <!-- White die cut base (scalloped circle) -->
    <circle cx="0" cy="0" r="255" class="die-cut"/>

    <!-- Ornate gold petal outer ring -->
    <g fill="#d4af37" stroke="#8a141b" stroke-width="2">
      ${Array.from({ length: 16 }, (_, i) => {
        const a = (i * 360) / 16;
        return `<path transform="rotate(${a}) translate(0, -220)" d="M -22,0 C -22,-20 0,-38 0,-38 C 0,-38 22,-20 22,0 Z" />`;
      }).join("")}
    </g>

    <!-- Main red badge circle -->
    <circle cx="0" cy="0" r="215" fill="#a81822" stroke="#d4af37" stroke-width="10" filter="url(#sticker-shadow)"/>

    <!-- White and gold alpona ring -->
    <circle cx="0" cy="0" r="195" fill="none" stroke="#fff9e6" stroke-width="4" stroke-dasharray="10,6"/>
    <circle cx="0" cy="0" r="185" fill="none" stroke="#d4af37" stroke-width="2"/>

    <!-- Dot accents -->
    ${Array.from({ length: 24 }, (_, i) => {
      const a = (i * 360) / 24;
      return `<circle transform="rotate(${a}) translate(0, -170)" r="3.5" fill="#fbe8a6"/>`;
    }).join("")}

    <!-- Calligraphy Text: দুগ্গা দুগ্গা in 2 stylish lines -->
    <text x="0" y="-45" class="txt-galada" font-size="86" fill="#fbe8a6">দুগ্গা</text>
    <text x="0" y="55" class="txt-galada" font-size="86" fill="#ffffff">দুগ্গা</text>
  </g>

  <!-- ==================== STICKER 3: মা আসছেন on cream paper scroll ==================== -->
  <!-- Centred at (1707, 500) -->
  <g transform="translate(1707, 500)">
    <!-- White die cut base -->
    <rect x="-225" y="-235" width="450" height="470" rx="36" class="die-cut"/>

    <!-- Parchment Scroll Body -->
    <path d="
      M -190,-180
      C -150,-195 150,-195 190,-180
      C 200,-100 200,100 190,180
      C 150,195 -150,195 -190,180
      C -200,100 -200,-100 -190,-180
      Z
    " fill="#fdf7e9" stroke="#c49a45" stroke-width="8" filter="url(#sticker-shadow)"/>

    <!-- Scroll Roll Ends -->
    <path d="M -200,-185 C -200,-205 200,-205 200,-185 C 200,-165 -200,-165 -200,-185 Z" fill="#e8d5aa" stroke="#a3782b" stroke-width="4"/>
    <path d="M -200,185 C -200,165 200,165 200,185 C 200,205 -200,205 -200,185 Z" fill="#e8d5aa" stroke="#a3782b" stroke-width="4"/>

    <!-- Red filigree corner borders -->
    <path d="M -160,-140 L -120,-140 M -160,-140 L -160,-100" stroke="#a81822" stroke-width="4" stroke-linecap="round"/>
    <path d="M 160,-140 L 120,-140 M 160,-140 L 160,-100" stroke="#a81822" stroke-width="4" stroke-linecap="round"/>
    <path d="M -160,140 L -120,140 M -160,140 L -160,100" stroke="#a81822" stroke-width="4" stroke-linecap="round"/>
    <path d="M 160,140 L 120,140 M 160,140 L 160,100" stroke="#a81822" stroke-width="4" stroke-linecap="round"/>

    <!-- Durga third-eye symbol at top -->
    <path d="M 0,-120 C 18,-105 18,-95 0,-80 C -18,-95 -18,-105 0,-120 Z" fill="#a81822"/>
    <circle cx="0" cy="-100" r="4" fill="#ffd700"/>

    <!-- Calligraphy Text -->
    <text x="0" y="20" class="txt-galada" font-size="88" fill="#a81822">মা আসছেন</text>
  </g>

  <!-- ==================== STICKER 4: আসছে বছর আবার হবে on torn paper note ==================== -->
  <!-- Centred at (341, 1500) -->
  <g transform="translate(341, 1500)">
    <!-- White die cut base -->
    <path class="die-cut" d="
      M -245,-175
      L 245,-175
      L 255,165
      L -245,175
      Z
    " />

    <!-- Torn paper card -->
    <path d="
      M -220,-150
      C -150,-155 150,-145 220,-150
      C 225,-60 220,60 225,140
      L 180,145 L 140,138 L 90,144 L 40,139 L -10,145 L -60,138 L -110,144 L -160,139 L -210,146
      C -225,60 -220,-60 -220,-150
      Z
    " fill="#fff9ee" stroke="#d5c4a1" stroke-width="6" filter="url(#sticker-shadow)"/>

    <!-- Red washi tape piece on top edge -->
    <rect x="-70" y="-165" width="140" height="32" rx="4" fill="#c0262d" opacity="0.9" stroke="#96151b" stroke-width="2"/>

    <!-- Alpona floral corner bottom-right -->
    <path d="M 140,60 C 170,75 190,105 195,125" stroke="#a81822" stroke-width="3" fill="none"/>
    <circle cx="160" cy="85" r="4" fill="#a81822"/>
    <circle cx="180" cy="105" r="4" fill="#a81822"/>

    <!-- Calligraphy Text: আসছে বছর / আবার হবে -->
    <text x="0" y="-30" class="txt-galada" font-size="64" fill="#88121a">আসছে বছর</text>
    <text x="0" y="55" class="txt-galada" font-size="70" fill="#a81822">আবার হবে</text>
  </g>

  <!-- ==================== STICKER 5: ঢাকের তালে with crossed dhak sticks ==================== -->
  <!-- Centred at (1024, 1500) -->
  <g transform="translate(1024, 1500)">
    <!-- White die cut base around sticks and badge -->
    <path class="die-cut" d="
      M -210,-190 L -160,-230 L 190,190 L 150,230 Z
      M 160,-230 L 210,-190 L -150,230 L -190,190 Z
      M -230,0 C -230,-120 230,-120 230,0 C 230,120 -230,120 -230,0 Z
    " />

    <!-- Two crossed wooden sticks -->
    <g stroke="#5d4037" stroke-width="2">
      <!-- Stick 1 -->
      <line x1="-190" y1="-210" x2="170" y2="210" stroke="#bcaaa4" stroke-width="18" stroke-linecap="round"/>
      <circle cx="-190" cy="-210" r="14" fill="#8d6e63"/>
      <!-- Stick 2 -->
      <line x1="170" y1="-210" x2="-190" y2="210" stroke="#bcaaa4" stroke-width="18" stroke-linecap="round"/>
      <circle cx="170" cy="-210" r="14" fill="#8d6e63"/>
    </g>

    <!-- Red tassel cords on sticks -->
    <path d="M 0,-10 C -30,-40 -50,-20 -40,10" fill="none" stroke="#c0262d" stroke-width="6"/>
    <path d="M 0,-10 C 30,-40 50,-20 40,10" fill="none" stroke="#c0262d" stroke-width="6"/>

    <!-- Oval Badge Body -->
    <ellipse cx="0" cy="0" rx="210" ry="110" fill="#fffaf0" stroke="#d4af37" stroke-width="10" filter="url(#sticker-shadow)"/>
    <ellipse cx="0" cy="0" rx="190" ry="92" fill="none" stroke="#a81822" stroke-width="4"/>

    <!-- Calligraphy Text -->
    <text x="0" y="5" class="txt-galada" font-size="82" fill="#a81822">ঢাকের তালে</text>
  </g>

  <!-- ==================== STICKER 6: শুভ দুর্গাপুজো in ornate gold frame ==================== -->
  <!-- Centred at (1707, 1500) -->
  <g transform="translate(1707, 1500)">
    <!-- White die cut base -->
    <rect x="-240" y="-170" width="480" height="340" rx="42" class="die-cut"/>

    <!-- Ornate Outer Gold Frame -->
    <rect x="-215" y="-145" width="430" height="290" rx="28" fill="#fffdf7" stroke="#d4af37" stroke-width="16" filter="url(#sticker-shadow)"/>
    
    <!-- Inner Red Hairline -->
    <rect x="-192" y="-122" width="384" height="244" rx="18" fill="none" stroke="#a81822" stroke-width="4"/>

    <!-- Ornate Corner Filigree -->
    <g fill="#d4af37">
      <circle cx="-192" cy="-122" r="12"/>
      <circle cx="192" cy="-122" r="12"/>
      <circle cx="-192" cy="122" r="12"/>
      <circle cx="192" cy="122" r="12"/>
      <!-- Top crest lotus -->
      <path transform="translate(0, -145) scale(0.6)" d="M 0,-25 C 15,-10 20,10 0,20 C -20,10 -15,-10 0,-25 Z"/>
    </g>

    <!-- Calligraphy Text: শুভ দুর্গাপুজো -->
    <text x="0" y="-15" class="txt-galada" font-size="78" fill="#a81822">শুভ</text>
    <text x="0" y="55" class="txt-galada" font-size="80" fill="#a81822">দুর্গাপুজো</text>
  </g>

</svg>
`;

await sharp(Buffer.from(svg))
  .png()
  .toFile("moodboard/stickers/s18-lekha.png");
console.log("Successfully generated s18-lekha.png!");
