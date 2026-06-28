"use client";
// FILE: components/terminal/HeroVisual.tsx
// Abstract stacked tiles for the hero, solid surfaces only, no glass.

import { G, BDR } from "./tokens";

const TILES = [
  { icon: "\u25CE", label: "Global RWA", offset: 0, size: 120 },
  { icon: "\u25C8", label: "Verified", offset: 28, size: 100 },
  { icon: "\u25C7", label: "Onchain", offset: 52, size: 88 },
];

export function HeroVisual() {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: 320,
      height: 220,
      margin: "0 auto",
    }}>
      <div style={{
        position: "absolute",
        inset: "-20% -10%",
        background: "var(--hero-accent)",
        borderRadius: "50%",
        opacity: 0.85,
        pointerEvents: "none",
      }} />
      {TILES.map((t, i) => (
        <div
          key={t.label}
          style={{
            position: "absolute",
            right: t.offset,
            top: i * 18,
            width: t.size,
            height: t.size * 0.72,
            borderRadius: 18,
            border: `1px solid ${BDR}`,
            background: "var(--surface)",
            boxShadow: i === 0 ? "var(--shadow-glow)" : "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
            zIndex: TILES.length - i,
          }}
        >
          <span style={{ fontSize: "1.5rem", color: G }}>{t.icon}</span>
          <span style={{
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: "0.62rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}
