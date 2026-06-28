"use client";
// FILE: components/terminal/HeroVisual.tsx
// Stacked glass tiles with wireframe icons, matching reference hero graphics.

import { G } from "./tokens";

const TILES = [
  {
    label: "Global RWA",
    offset: 0,
    size: 148,
    z: 3,
    svg: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="22" stroke={G} strokeWidth="1.5" opacity="0.9" />
        <ellipse cx="28" cy="28" rx="22" ry="8" stroke={G} strokeWidth="1" opacity="0.6" />
        <ellipse cx="28" cy="28" rx="8" ry="22" stroke={G} strokeWidth="1" opacity="0.6" />
        <circle cx="28" cy="28" r="3" fill={G} />
      </svg>
    ),
  },
  {
    label: "Verified",
    offset: 36,
    size: 124,
    z: 2,
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="4" stroke={G} strokeWidth="1.5" opacity="0.85" />
        <path d="M16 24 L22 30 L34 18" stroke={G} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Onchain",
    offset: 68,
    size: 108,
    z: 1,
    svg: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <rect x="6" y="14" width="32" height="20" rx="3" stroke={G} strokeWidth="1.5" />
        <path d="M14 14 V10 H30 V14" stroke={G} strokeWidth="1.5" />
        <circle cx="22" cy="24" r="4" stroke={G} strokeWidth="1.5" />
      </svg>
    ),
  },
];

export function HeroVisual() {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: 360,
      height: 260,
      margin: "0 auto",
    }}>
      {TILES.map((t) => (
        <div
          key={t.label}
          style={{
            position: "absolute",
            right: t.offset,
            top: (3 - t.z) * 22,
            width: t.size,
            height: t.size * 0.78,
            borderRadius: 22,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-glass)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            boxShadow: t.z === 3 ? "var(--shadow-glow)" : "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            zIndex: t.z,
            transform: `perspective(800px) rotateY(-8deg) rotateX(4deg)`,
          }}
        >
          {t.svg}
          <span style={{
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: "0.65rem",
            fontWeight: 700,
            color: G,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}
