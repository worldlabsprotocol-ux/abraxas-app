"use client";
// FILE: components/cielo/CieloLiveTrustStrip.tsx
// Airbnb social proof — Cielo asset pages only. Abraxas remains primary path.

import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface Props {
  compact?: boolean;
}

export function CieloLiveTrustStrip({ compact }: Props) {
  const { guestProfile, airbnbUrl, title } = FLAGSHIP_PROPERTY;
  const rating = guestProfile.avgRating.toFixed(1);
  const reviews = guestProfile.totalReviews;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: compact ? "0.5rem 0.75rem" : "0.65rem 1rem",
      padding: compact ? "0.55rem 0.75rem" : "0.75rem 0.9rem",
      borderRadius: 12,
      background: "rgba(16,185,129,0.06)",
      border: "1px solid rgba(16,185,129,0.22)",
      marginBottom: compact ? "0.85rem" : "1rem",
    }}>
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: ACCENT, marginBottom: 3,
        }}>
          Already live
        </div>
        <div style={{ fontFamily: FONT, fontSize: compact ? "0.72rem" : "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--text-primary)" }}>{title}</strong>
          {" "}is a real, operating stay — {rating}★ from {reviews} guest reviews on Airbnb.
          {" "}Abraxas adds verified-rate access and USDC settlement; Airbnb shows ongoing hospitality history.
        </div>
      </div>
      <a
        href={airbnbUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flexShrink: 0,
          padding: "0.45rem 0.85rem",
          borderRadius: 999,
          border: "1px solid var(--border-strong)",
          background: "var(--surface)",
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        View on Airbnb ↗
      </a>
    </div>
  );
}
