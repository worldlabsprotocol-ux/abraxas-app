"use client";
// FILE: components/cielo/CieloGuestReviews.tsx
// Compact guest intelligence — expandable, not a wall of text.

import { useState } from "react";
import Link from "next/link";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const PREVIEW = 2;
const TRUNCATE = 140;

const G = FLAGSHIP_PROPERTY.guestProfile;

export function CieloGuestReviews({ tone = "default" }: { tone?: "default" | "flagship" }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? G.reviews : G.reviews.slice(0, PREVIEW);
  const dark = tone === "flagship";
  const textPrimary = dark ? "#F2F6F3" : "var(--text-primary)";
  const textSecondary = dark ? "rgba(242,246,243,0.55)" : "var(--text-secondary)";
  const textMuted = dark ? "rgba(242,246,243,0.35)" : "var(--text-muted)";
  const cardBg = dark ? "#121A16" : "var(--surface-raised)";
  const cardBorder = dark ? "rgba(255,255,255,0.09)" : "var(--border)";

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "1rem", marginBottom: "0.85rem" }}>
        <div style={{ fontFamily: FONT, fontSize: "2.25rem", fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
          {G.avgRating.toFixed(1)}
        </div>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: textPrimary }}>
            {G.totalReviews} guest reviews
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 600 }}>
            ★ Superhost · {G.responseTime}
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.45rem",
        marginBottom: "0.85rem",
      }}>
        {[
          ["Cleanliness", G.cleanliness],
          ["Accuracy", G.accuracy],
          ["Communication", G.communication],
          ["Location", G.location],
          ["Check-in", G.checkIn],
          ["Value", G.value],
        ].map(([label, score]) => (
          <div key={label} style={{
            padding: "0.45rem 0.55rem", borderRadius: 8,
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: textMuted, textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: textPrimary }}>
              {score} ★
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {visible.map((r, i) => (
          <div key={`${r.name}-${i}`} style={{
            padding: "0.65rem 0.75rem", borderRadius: 10,
            background: cardBg, border: `1px solid ${cardBorder}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: textPrimary }}>
                {r.name}{r.location ? ` · ${r.location}` : ""}
              </span>
              <span style={{ fontFamily: FONT, fontSize: "0.65rem", color: textMuted, flexShrink: 0 }}>
                {r.when}
              </span>
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.76rem", color: textSecondary,
              lineHeight: 1.55, margin: 0,
            }}>
              {expanded ? r.highlight : truncateReview(r.highlight)}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.75rem", alignItems: "center" }}>
        {G.reviews.length > PREVIEW && (
          <button type="button" onClick={() => setExpanded(e => !e)} style={{
            padding: "0.45rem 0.85rem", borderRadius: 999, border: `1px solid ${cardBorder}`,
            background: "transparent", color: textPrimary,
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
          }}>
            {expanded ? "Show fewer" : `Show ${G.reviews.length} featured reviews`}
          </button>
        )}
        <Link href={FLAGSHIP_PROPERTY.airbnbUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
          All {G.totalReviews} reviews on Airbnb →
        </Link>
      </div>
    </div>
  );
}

function truncateReview(text: string): string {
  if (text.length <= TRUNCATE) return text;
  return `${text.slice(0, TRUNCATE).trim()}…`;
}
