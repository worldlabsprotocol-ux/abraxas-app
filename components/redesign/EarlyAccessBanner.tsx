"use client";
// FILE: components/redesign/EarlyAccessBanner.tsx

import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function EarlyAccessBanner() {
  return (
    <div role="status" style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem 1rem",
      padding: "0.75rem 1rem", borderRadius: 12,
      background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)",
    }}>
      <span style={{
        fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#3B82F6", padding: "0.2rem 0.5rem", borderRadius: 6,
        background: "rgba(59,130,246,0.12)",
      }}>
        Design partner phase
      </span>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.55, margin: 0, flex: "1 1 200px",
      }}>
        Early access — full registry metrics and third-party assets rolling out as audits complete.
        Genesis asset <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>Cielo Sunrise</strong> is live end-to-end.
      </p>
      <Link href="/metrics" style={{
        fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700,
        color: ACCENT, textDecoration: "none", whiteSpace: "nowrap",
      }}>
        Live metrics →
      </Link>
    </div>
  );
}
