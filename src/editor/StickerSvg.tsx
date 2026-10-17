import { memo } from "react";
import { stickerBox, type StickerDef } from "./stickers";

// SVG twin of drawSticker() in stickers.ts.
export const StickerSvg = memo(function StickerSvg({ def }: { def: StickerDef }) {
  const box = stickerBox(def);
  const cut = def.cut ?? 12;
  return (
    <svg
      viewBox={`${-box.pad} ${-box.pad} ${box.w} ${box.h}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", overflow: "visible" }}
    >
      {cut > 0 &&
        [0, 1].map((pass) => {
          const color = pass === 0 ? "rgba(40,10,5,0.22)" : "#ffffff";
          return (
            <g key={pass} transform={pass === 0 ? "translate(0 3)" : undefined}>
              {def.prims
                .filter((p) => p.cut !== false)
                .map((p, i) => (
                  <path
                    key={i}
                    d={p.d}
                    fill={p.fill && p.fill !== "none" ? color : "none"}
                    fillRule={p.evenodd ? "evenodd" : undefined}
                    stroke={color}
                    strokeWidth={(p.stroke ? p.sw ?? 0 : 0) + cut}
                  />
                ))}
            </g>
          );
        })}
      {def.prims.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? "none"}
          fillRule={p.evenodd ? "evenodd" : undefined}
          stroke={p.stroke && p.sw ? p.stroke : undefined}
          strokeWidth={p.stroke && p.sw ? p.sw : undefined}
          opacity={p.op}
        />
      ))}
    </svg>
  );
});
