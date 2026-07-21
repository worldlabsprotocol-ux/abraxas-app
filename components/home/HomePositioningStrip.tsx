"use client";
// FILE: components/home/HomePositioningStrip.tsx
// Tokenization positioning — copy only (demo lives in status strip).

import Link from "next/link";
import { ASSET_POSITIONING_BODY } from "@/lib/assetPositioning";
import { INTERSECTION_BODY } from "@/lib/intersectionThesis";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomePositioningStrip() {
  return (
    <section
      aria-label="Asset positioning"
      style={{
        padding: "0.85rem 0 1rem",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          padding: "0.85rem 1rem",
          borderRadius: 14,
          border: "1px solid rgba(232,197,71,0.28)",
          background: "linear-gradient(135deg, rgba(232,197,71,0.06) 0%, var(--surface-raised) 100%)",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem", maxWidth: 640 }}>
          {ASSET_POSITIONING_BODY}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55, maxWidth: 640 }}>
          {INTERSECTION_BODY}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center", marginTop: "0.65rem" }}>
          <Btn href="/build" size="sm">Position your asset →</Btn>
          <Link href="/why" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            Why now →
          </Link>
        </div>
      </div>
    </section>
  );
}
