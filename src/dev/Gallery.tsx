// Dev-only art check: every template in both sizes and the whole sticker
// sheet, big. Open http://localhost:5190/?gallery while `npm run dev` runs.
import { useEffect, useState } from "react";
import { templateThumb } from "../editor/render";
import { StickerSvg } from "../editor/StickerSvg";
import { STICKERS } from "../editor/stickers";
import { TEMPLATES } from "../editor/templates";
import type { Format } from "../editor/types";

function Thumb({ id, format, span }: { id: string; format: Format; span: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void templateThumb(id, format, 540).then(setUrl);
  }, [id, format]);
  return url ? <img src={url} alt={id} style={{ width: 300 * span, display: "block" }} /> : <div style={{ width: 300 * span, height: 300 }} />;
}

export function Gallery() {
  const only = new URLSearchParams(location.search).get("t");
  const list = only ? TEMPLATES.filter((t) => t.id === only) : TEMPLATES;
  return (
    <div style={{ padding: 20, background: "#333", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {list.map((t) =>
          (["post", "story"] as Format[]).map((f) => (
            <figure key={t.id + f} style={{ margin: 0 }}>
              <Thumb id={t.id} format={f} span={t.span ?? 1} />
              <figcaption style={{ fontSize: 12 }}>
                {t.id} · {f}
              </figcaption>
            </figure>
          )),
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 30, background: "#7a5a4a", padding: 20 }}>
        {STICKERS.map((s) => (
          <figure key={s.id} style={{ margin: 0, width: 150 }}>
            <StickerSvg def={s} />
            <figcaption style={{ fontSize: 12 }}>{s.id}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
