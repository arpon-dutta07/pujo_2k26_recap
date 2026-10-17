// Word-by-word rise for the hero headline (transform and opacity only, no blur:
// a blur filter per word costs a lot on phones). Bangla words stay whole, so
// conjuncts and matras never get split across animated pieces.
import { motion } from "motion/react";

export function Headline({ lines }: { lines: Array<{ text: string; accent?: boolean }> }) {
  let n = 0;
  return (
    <h1>
      {lines.map((line, li) => (
        <span key={li} className={line.accent ? "accent" : undefined} style={{ display: "block" }}>
          {line.text.split(" ").map((word, wi, all) => {
            const i = n++;
            return (
              <motion.span
                key={wi}
                className="headline-word"
                initial={{ opacity: 0, y: "0.6em" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
                {wi < all.length - 1 ? " " : ""}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
