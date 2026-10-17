// The studio's tool panels: templates, photos, stickers and words.
import { memo, useEffect, useRef, useState } from "react";
import { CheckIcon, PhotosIcon, PlusIcon, WandIcon } from "../components/Icons";
import { bnNum } from "../lib/bn";
import { dayLabel } from "../lib/days";
import type { Photo } from "../lib/types";
import { contrastInk, FONTS, PAPER, templateThumb } from "./render";
import { StickerSvg } from "./StickerSvg";
import { STICKERS } from "./stickers";
import { templateById, templatesFor } from "./templates";
import { FORMATS, type FontKey, type Format, type TextItem, type TextStyle } from "./types";

// ---------- templates ----------

function useThumb(id: string, format: Format) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    void templateThumb(id, format).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id, format]);
  return url;
}

export const TemplateTile = memo(function TemplateTile({
  id,
  format,
  active,
  onPick,
}: {
  id: string;
  format: Format;
  active?: boolean;
  onPick?: (id: string) => void;
}) {
  const url = useThumb(id, format);
  const def = templateById(id);
  const span = def.span ?? 1;
  const f = FORMATS[format];
  return (
    <button
      className="tp-tile"
      aria-pressed={active}
      style={span > 1 ? { gridColumn: "span 2" } : undefined}
      onClick={() => onPick?.(id)}
      type="button"
    >
      <span className="tp-img" style={{ aspectRatio: `${f.w * span} / ${f.h}` }}>
        {url && <img src={url} alt="" draggable={false} />}
      </span>
      <span className="tp-name">
        {def.name}
        {span > 1 && <small> · {bnNum(span)} পাতা জোড়া</small>}
      </span>
    </button>
  );
});

export function TemplatePanel({ format, current, onPick }: { format: Format; current?: string; onPick: (id: string) => void }) {
  const live = templatesFor(format);
  const singles = live.filter((t) => (t.span ?? 1) === 1);
  const panos = live.filter((t) => (t.span ?? 1) > 1);
  return (
    <div className="panel-body">
      <p className="panel-hint">যে পাতাটা সামনে আছে, তাতে বসবে। ছবিগুলো নতুন ফ্রেমেও থেকে যাবে।</p>
      <div className="tp-grid">
        {singles.map((t) => (
          <TemplateTile key={t.id} id={t.id} format={format} active={current === t.id} onPick={onPick} />
        ))}
      </div>
      {panos.length > 0 && (
        <>
          <h4 className="panel-title">প্যানোরামা: সোয়াইপ করলে জোড়া লাগে</h4>
          <div className="tp-grid">
            {panos.map((t) => (
              <TemplateTile key={t.id} id={t.id} format={format} active={current === t.id} onPick={onPick} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- photos ----------

const PhotoTile = memo(function PhotoTile({
  photo,
  used,
  onPick,
}: {
  photo: Photo;
  used: boolean;
  onPick: (id: string) => void;
}) {
  const label = dayLabel(photo.day);
  return (
    <button
      type="button"
      className="ph-tile"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-photo", photo.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onPick(photo.id)}
    >
      <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" draggable={false} />
      {label && <span className="ph-day">{label}</span>}
      {photo.status === "blurry" && <span className="ph-flag">ঝাপসা</span>}
      {photo.status === "duplicate" && <span className="ph-flag">একই পোজ</span>}
      {used && (
        <span className="ph-used" aria-label="ব্যবহার হয়েছে">
          <CheckIcon />
        </span>
      )}
    </button>
  );
});

export function PhotoPanel({
  ai,
  mine,
  rest,
  used,
  adding,
  hint,
  onPick,
  onFiles,
  onAutofill,
}: {
  ai: Photo[];
  mine: Photo[];
  rest: Photo[];
  used: Set<string>;
  adding: number;
  hint: string;
  onPick: (id: string) => void;
  onFiles: (files: File[]) => void;
  onAutofill: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [showAll, setShowAll] = useState(false);
  const shownRest = showAll ? rest : rest.slice(0, 24);
  return (
    <div className="panel-body">
      <div className="panel-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={() => input.current?.click()}>
          <PhotosIcon /> ফোন থেকে ছবি দাও
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onAutofill}>
          <WandIcon /> ফাঁকা জায়গা AI ভরে দিক
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
      </div>
      <p className="panel-hint">{hint}</p>

      {(mine.length > 0 || adding > 0) && (
        <>
          <h4 className="panel-title">তোমার দেওয়া</h4>
          <div className="ph-grid">
            {mine.map((p) => (
              <PhotoTile key={p.id} photo={p} used={used.has(p.id)} onPick={onPick} />
            ))}
            {Array.from({ length: adding }, (_, i) => (
              <div key={`a${i}`} className="ph-tile ph-loading" aria-label="ছবি দেখছি">
                <span />
              </div>
            ))}
          </div>
        </>
      )}

      <h4 className="panel-title">AI-র বাছাই</h4>
      <div className="ph-grid">
        {ai.map((p) => (
          <PhotoTile key={p.id} photo={p} used={used.has(p.id)} onPick={onPick} />
        ))}
      </div>

      {rest.length > 0 && (
        <>
          <h4 className="panel-title">বাকি ছবি</h4>
          <div className="ph-grid">
            {shownRest.map((p) => (
              <PhotoTile key={p.id} photo={p} used={used.has(p.id)} onPick={onPick} />
            ))}
          </div>
          {!showAll && rest.length > shownRest.length && (
            <button type="button" className="btn btn-ghost btn-small panel-more" onClick={() => setShowAll(true)}>
              আরও {bnNum(rest.length - shownRest.length)}টা দেখাও
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------- stickers ----------

export type TextDraft = Pick<TextItem, "text" | "font" | "color" | "style">;

export const TEXT_PRESETS: TextDraft[] = [
  { text: "শুভ শারদীয়া", font: "display", color: "#b3121b", style: "paper" },
  { text: "আসছে বছর\nআবার হবে", font: "display", color: "#fff6e6", style: "shadow" },
  { text: "দুগ্গা দুগ্গা", font: "display", color: "#f2c46d", style: "pill" },
  { text: "মা আসছেন", font: "display", color: "#b3121b", style: "pill" },
  { text: "ঢাকের তালে", font: "body", color: "#fff6e6", style: "shadow" },
  { text: "অষ্টমীর অঞ্জলি", font: "serif", color: "#6d0f17", style: "paper" },
  { text: "Puja Vibes", font: "display", color: "#fff6e6", style: "shadow" },
  { text: "পুজো ২০২৬", font: "serif", color: "#f2c46d", style: "pill" },
];

export function StickerPanel({ onSticker, onText }: { onSticker: (kind: string) => void; onText: (d: TextDraft) => void }) {
  return (
    <div className="panel-body">
      <p className="panel-hint">ট্যাপ করলে পাতার মাঝখানে বসবে। টেনে সরাও, কোণের গোল বোতাম টেনে ঘোরাও আর বড়-ছোট করো।</p>
      <div className="st-grid">
        {STICKERS.map((s) => (
          <button key={s.id} type="button" className="st-tile" onClick={() => onSticker(s.id)} aria-label={s.name} title={s.name}>
            <StickerSvg def={s} />
          </button>
        ))}
      </div>
      <h4 className="panel-title">লেখা-স্টিকার</h4>
      <div className="tx-presets">
        {TEXT_PRESETS.map((t) => (
          <button key={t.text} type="button" className="tx-preset" onClick={() => onText(t)}>
            <span
              style={{
                fontFamily: `"${FONTS[t.font].family}"`,
                fontWeight: FONTS[t.font].weight,
                color: t.style === "pill" ? contrastInk(t.color) : t.color,
                background: t.style === "pill" ? t.color : t.style === "paper" ? PAPER : undefined,
                textShadow: t.style === "shadow" ? "0 2px 8px rgba(0,0,0,0.6)" : undefined,
              }}
              data-style={t.style}
            >
              {t.text.replace("\n", " ")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- words ----------

export const COLORS = ["#fff6e6", "#f2c46d", "#b3121b", "#6d0f17", "#1a0d08", "#ffffff", "#24522a", "#ef8aa8"];
const STYLES: Array<[TextStyle, string]> = [
  ["plain", "সাধারণ"],
  ["shadow", "ছায়া"],
  ["paper", "কাগজ"],
  ["pill", "রঙিন পাড়"],
];

export function TextPanel({
  item,
  onAdd,
  onChange,
}: {
  item: TextItem | null;
  onAdd: (d: TextDraft) => void;
  onChange: (patch: Partial<TextItem>) => void;
}) {
  const [draft, setDraft] = useState<TextDraft>({ text: "", font: "display", color: "#fff6e6", style: "shadow" });
  const editing = Boolean(item);
  const value = item ? item : draft;
  const [text, setText] = useState(item?.text ?? "");
  useEffect(() => setText(item?.text ?? ""), [item?.id, item?.text]);

  const set = (patch: Partial<TextDraft>) => (editing ? onChange(patch) : setDraft((d) => ({ ...d, ...patch })));
  const submit = () => {
    if (editing) {
      if (text.trim() && text !== item!.text) onChange({ text, bind: undefined });
    } else if (text.trim()) {
      onAdd({ ...draft, text });
      setText("");
    }
  };

  return (
    <div className="panel-body tx-panel">
      <textarea
        className="text-input tx-area"
        value={text}
        rows={2}
        maxLength={80}
        placeholder="এখানে লেখো, যেমন: অষ্টমীর সন্ধে"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => editing && submit()}
      />
      <div className="tx-row">
        <span>ফন্ট</span>
        <div className="pills">
          {(Object.keys(FONTS) as FontKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className="pill"
              aria-pressed={value.font === k}
              style={{ fontFamily: `"${FONTS[k].family}"`, fontWeight: FONTS[k].weight }}
              onClick={() => set({ font: k })}
            >
              পুজো
            </button>
          ))}
        </div>
      </div>
      <div className="tx-row">
        <span>রং</span>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              aria-label={c}
              aria-pressed={value.color === c}
              style={{ background: c }}
              onClick={() => set({ color: c })}
            />
          ))}
        </div>
      </div>
      <div className="tx-row">
        <span>ধরন</span>
        <div className="pills">
          {STYLES.map(([k, label]) => (
            <button key={k} type="button" className="pill" aria-pressed={value.style === k} onClick={() => set({ style: k })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-small" onClick={submit} disabled={!text.trim()}>
        {editing ? (
          "লেখা বদলাও"
        ) : (
          <>
            <PlusIcon /> পাতায় বসাও
          </>
        )}
      </button>
    </div>
  );
}
