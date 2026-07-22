"use client";
// FILE: components/home/HomeMarqueeStrip.tsx
// DeFi / commerce-inspired marquee — sour.gg ticker energy.

import { ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const ITEMS = [
  "REAL WORLD ASSET TOKENIZATION",
  "RWA VERIFICATION APP",
  "REUSABLE VERIFICATION",
  "VERIFY BEFORE ACT",
  "SIGNED PROOFS LIVE",
  "INSTITUTIONAL RWA",
  "PICK YOUR PATH ↓",
];

export function HomeMarqueeStrip() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div
      aria-hidden
      style={{
        overflow: "hidden",
        borderBottom: "1px solid var(--border)",
        background: "rgba(232,197,71,0.06)",
        marginBottom: "clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      <div className="abx-marquee-track" style={{ display: "flex", width: "max-content" }}>
        {track.map((text, i) => (
          <span
            key={`${text}-${i}`}
            style={{
              fontFamily: ABRAXAS_FONT_MONO,
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "var(--accent)",
              padding: "0.55rem 1.75rem",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes abx-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .abx-marquee-track {
          animation: abx-marquee 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .abx-marquee-track { animation: none; flex-wrap: wrap; width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
