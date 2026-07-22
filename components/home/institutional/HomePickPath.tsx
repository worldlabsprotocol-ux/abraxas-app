"use client";
// FILE: components/home/institutional/HomePickPath.tsx
// sour.gg "Pick your Path" — jumps to slideshow chapter.

import { motion } from "framer-motion";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { INSTITUTIONAL_CHAPTERS, type InstitutionalChapterId } from "@/lib/institutionalMasterSlides";

const FONT = DEMO_TYPOGRAPHY.fontSans;

export function HomePickPath({
  activeChapter,
  onSelect,
}: {
  activeChapter: InstitutionalChapterId;
  onSelect: (id: InstitutionalChapterId) => void;
}) {
  return (
    <div style={{ marginBottom: "clamp(1rem, 3vw, 1.5rem)" }}>
      <div
        style={{
          fontFamily: DEMO_TYPOGRAPHY.fontMono,
          fontSize: "0.58rem",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COSMIC_PALETTE.gold,
          textAlign: "center",
          marginBottom: "0.75rem",
        }}
      >
        Pick your path
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 108px), 1fr))",
          gap: 10,
        }}
      >
        {INSTITUTIONAL_CHAPTERS.map((ch) => {
          const active = ch.id === activeChapter;
          return (
            <motion.button
              key={ch.id}
              type="button"
              onClick={() => onSelect(ch.id)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: "1rem 0.75rem",
                borderRadius: 18,
                border: `2px solid ${active ? COSMIC_PALETTE.gold : "rgba(255,255,255,0.1)"}`,
                background: active
                  ? `linear-gradient(145deg, ${COSMIC_PALETTE.gold}18, rgba(0,0,0,0.4))`
                  : "rgba(0,0,0,0.35)",
                cursor: "pointer",
                textAlign: "center",
                boxShadow: active ? `0 8px 32px ${COSMIC_PALETTE.gold}22` : "none",
              }}
            >
              <div style={{ fontSize: "1.35rem", marginBottom: 6 }}>{ch.emoji}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "#FAFAFA", marginBottom: 4 }}>
                {ch.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: COSMIC_PALETTE.textMuted, lineHeight: 1.4 }}>
                {ch.blurb}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
