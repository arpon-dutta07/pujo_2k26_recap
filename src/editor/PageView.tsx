// One page drawn with plain DOM: template art as images, photos, stickers and
// words positioned in percentages, so the page scales with CSS alone and
// dragging only moves one element.
import { memo, useEffect, useState, type CSSProperties } from "react";
import { CloseIcon, PlusIcon, RotateIcon } from "../components/Icons";
import type { Photo } from "../lib/types";
import { place, slotRadiusCss } from "./geometry";
import { usePhotoSrc } from "./photos";
import { contrastInk, FONTS, LINE_HEIGHT, PAPER, pageSize, templateLayers, textOf, type Layers } from "./render";
import { StickerSvg } from "./StickerSvg";
import { stickerBox, stickerById } from "./stickers";
import { templateById } from "./templates";
import type { Fill, Format, Page, SlotDef, StickerItem, TextItem } from "./types";

export type Sel = { kind: "slot" | "sticker" | "text"; id: string };
export type Live =
  | { kind: "slot"; id: string; fill: Fill }
  | { kind: "sticker"; id: string; item: StickerItem }
  | { kind: "text"; id: string; item: TextItem };

const pct = (v: number, base: number) => `${(v / base) * 100}%`;

export function useLayers(templateId: string, format: Format): Layers | null {
  const [layers, setLayers] = useState<{ key: string; value: Layers } | null>(null);
  const key = `${templateId}:${format}`;
  useEffect(() => {
    let alive = true;
    void templateLayers(templateId, format).then((value) => alive && setLayers({ key, value }));
    return () => {
      alive = false;
    };
  }, [templateId, format, key]);
  return layers?.key === key ? layers.value : null;
}

const SlotView = memo(function SlotView({
  slot,
  fill,
  photo,
  W,
  H,
  interactive,
  selected,
}: {
  slot: SlotDef;
  fill: Fill | null;
  photo: Photo | undefined;
  W: number;
  H: number;
  interactive: boolean;
  selected: boolean;
}) {
  const pl = photo && fill ? place(slot.w, slot.h, photo.width / photo.height, fill) : null;
  const src = usePhotoSrc(photo, pl ? pl.w > 480 : false);
  return (
    <div
      className="pv-slot"
      data-hit="slot"
      data-id={slot.id}
      data-selected={selected || undefined}
      style={{
        left: pct(slot.x, W),
        top: pct(slot.y, H),
        width: pct(slot.w, W),
        height: pct(slot.h, H),
        borderRadius: slotRadiusCss(slot),
        rotate: slot.rotate ? `${slot.rotate}deg` : undefined,
      }}
    >
      {pl && src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          style={{ left: pct(pl.x, slot.w), top: pct(pl.y, slot.h), width: pct(pl.w, slot.w), height: pct(pl.h, slot.h) }}
        />
      ) : interactive ? (
        <span className="pv-add">
          <PlusIcon />
        </span>
      ) : null}
    </div>
  );
});

function Handles({ id }: { id: string }) {
  return (
    <>
      <span className="pv-handle pv-handle-del" data-hit="remove" data-id={id} role="button" aria-label="মুছে দাও">
        <CloseIcon />
      </span>
      <span className="pv-handle pv-handle-rot" data-hit="rotate" data-id={id} role="button" aria-label="ঘোরাও, বড়-ছোট করো">
        <RotateIcon />
      </span>
    </>
  );
}

const StickerView = memo(function StickerView({
  item,
  W,
  H,
  selected,
}: {
  item: StickerItem;
  W: number;
  H: number;
  selected: boolean;
}) {
  const def = stickerById(item.kind);
  if (!def) return null;
  const { h } = stickerBox(item);
  return (
    <div
      className="pv-item"
      data-hit="sticker"
      data-id={item.id}
      data-selected={selected || undefined}
      style={{
        left: pct(item.x - item.size / 2, W),
        top: pct(item.y - h / 2, H),
        width: pct(item.size, W),
        height: pct(h, H),
        rotate: `${item.rotate}deg`,
      }}
    >
      <div className="pv-sticker" style={{ scale: item.flip ? "-1 1" : undefined }}>
        <StickerSvg def={def} />
      </div>
      {selected && <Handles id={item.id} />}
    </div>
  );
});

const TextView = memo(function TextView({
  item,
  content,
  W,
  H,
  selected,
  interactive,
}: {
  item: TextItem;
  content: string;
  W: number;
  H: number;
  selected: boolean;
  interactive: boolean;
}) {
  if (!content.trim() && !(interactive && selected)) return null;
  const f = FONTS[item.font];
  const boxed = item.style === "paper" || item.style === "pill";
  const tx = item.align === "left" ? "0%" : item.align === "right" ? "-100%" : "-50%";
  const style: CSSProperties = {
    left: pct(item.x, W),
    top: pct(item.y, H),
    fontFamily: `"${f.family}"`,
    fontWeight: f.weight,
    fontSize: `${(item.size / W) * 100}cqw`,
    lineHeight: LINE_HEIGHT,
    color: item.style === "pill" ? contrastInk(item.color) : item.color,
    transform: `translate(${tx}, -50%) rotate(${item.rotate}deg)`,
    transformOrigin: item.align === "left" ? "0% 50%" : item.align === "right" ? "100% 50%" : "50% 50%",
    textAlign: item.align,
    padding: boxed ? "0.25em 0.5em" : 0,
    background: item.style === "pill" ? item.color : item.style === "paper" ? PAPER : undefined,
    borderRadius: item.style === "pill" ? 999 : item.style === "paper" ? "0.12em" : undefined,
    boxShadow: boxed ? "0 0.08em 0.3em rgba(30,10,5,0.3)" : undefined,
    textShadow: item.style === "shadow" ? "0 0.06em 0.28em rgba(0,0,0,0.6)" : undefined,
  };
  return (
    <div className="pv-text" data-hit="text" data-id={item.id} data-selected={selected || undefined} style={style}>
      {content || " "}
      {selected && <Handles id={item.id} />}
    </div>
  );
});

export const PageView = memo(function PageView({
  page,
  format,
  photo,
  live = null,
  selected = null,
  interactive = false,
}: {
  page: Page;
  format: Format;
  photo: (id: string) => Photo | undefined;
  live?: Live | null;
  selected?: Sel | null;
  interactive?: boolean;
}) {
  const def = templateById(page.template);
  const { W, H, span, slideW } = pageSize(format, def);
  const layout = def.layout(W, H);
  const layers = useLayers(page.template, format);
  const isSel = (kind: Sel["kind"], id: string) => selected?.kind === kind && selected.id === id;
  const selSlot = selected?.kind === "slot" ? layout.slots.find((s) => s.id === selected.id) : undefined;

  return (
    <div className="pv" data-page={page.id} style={{ aspectRatio: `${W} / ${H}` }}>
      {layers?.bg ? <img className="pv-layer" src={layers.bg} alt="" draggable={false} /> : null}
      {layout.slots.map((s) => {
        const fill = live?.kind === "slot" && live.id === s.id ? live.fill : page.fills[s.id] ?? null;
        return (
          <SlotView
            key={s.id}
            slot={s}
            fill={fill}
            photo={fill ? photo(fill.photoId) : undefined}
            W={W}
            H={H}
            interactive={interactive}
            selected={isSel("slot", s.id)}
          />
        );
      })}
      {layers?.over && <img className="pv-layer pv-over" src={layers.over} alt="" draggable={false} />}
      {selSlot && (
        <div
          className="pv-slot-sel"
          style={{
            left: pct(selSlot.x, W),
            top: pct(selSlot.y, H),
            width: pct(selSlot.w, W),
            height: pct(selSlot.h, H),
            borderRadius: slotRadiusCss(selSlot),
            rotate: selSlot.rotate ? `${selSlot.rotate}deg` : undefined,
          }}
        />
      )}
      {page.stickers.map((st) => (
        <StickerView
          key={st.id}
          item={live?.kind === "sticker" && live.id === st.id ? live.item : st}
          W={W}
          H={H}
          selected={interactive && isSel("sticker", st.id)}
        />
      ))}
      {page.texts.map((t) => {
        const item = live?.kind === "text" && live.id === t.id ? live.item : t;
        return (
          <TextView
            key={t.id}
            item={item}
            content={textOf(item, page, photo)}
            W={W}
            H={H}
            selected={interactive && isSel("text", t.id)}
            interactive={interactive}
          />
        );
      })}
      {span > 1 &&
        Array.from({ length: span - 1 }, (_, i) => <div key={i} className="pv-seam" style={{ left: pct((i + 1) * slideW, W) }} />)}
    </div>
  );
});

