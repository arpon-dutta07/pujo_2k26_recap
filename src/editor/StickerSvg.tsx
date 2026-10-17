import { memo } from "react";
import type { StickerDef } from "./stickers";

// Image-based sticker component for editor and panels per ANTIGRAVITY.md Task B.
export const StickerSvg = memo(function StickerSvg({ def }: { def: StickerDef }) {
  return (
    <img
      src={def.src}
      alt={def.name}
      loading="lazy"
      draggable={false}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))",
      }}
    />
  );
});
