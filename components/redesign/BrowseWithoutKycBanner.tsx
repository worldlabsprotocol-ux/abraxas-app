"use client";
// FILE: components/redesign/BrowseWithoutKycBanner.tsx
// Coinbase/Binance-style: explore the platform before any ID check.

import { consumerCopy } from "@/lib/consumerCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function BrowseWithoutKycBanner() {
  return (
    <div style={{
      padding: "1rem 1.15rem",
      borderRadius: 14,
      background: `${ACCENT}0A`,
      border: `1px solid ${ACCENT}33`,
      display: "flex",
      flexWrap: "wrap",
      gap: "0.75rem",
      alignItems: "center",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${ACCENT}18`, border: `1px solid ${ACCENT}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT, fontSize: "1rem", color: ACCENT,
      }}>
        ✓
      </div>
      <div style={{ flex: "1 1 240px" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700,
          color: "var(--text-primary)", marginBottom: "0.25rem",
        }}>
          {consumerCopy.browseBanner.title}
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: 0,
        }}>
          {consumerCopy.browseBanner.body}
        </p>
      </div>
    </div>
  );
}
