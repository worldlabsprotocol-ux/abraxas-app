"use client";
// FILE: components/redesign/TrustMetricsStrip.tsx
// Confident trust signals — no zero counters or defensive copy on the homepage.

import Link from "next/link";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const REGISTRY_COUNT = EXPLORE_ASSETS.length;
const ASSET_CLASSES = new Set(EXPLORE_ASSETS.map(a => a.assetClass.split(" · ")[0])).size;

const SIGNALS = [
  {
    value: String(REGISTRY_COUNT),
    label: "Assets in registry",
    sub: `${ASSET_CLASSES} asset classes · browse without ID`,
    accent: true,
  },
  {
    value: "$1.1M+",
    label: "Highest attested value",
    sub: "Genesis pilot property · independently appraised",
    accent: true,
  },
  {
    value: "Apple Pay",
    label: "Book with card",
    sub: "Conversion handled in checkout — no wallet setup",
    accent: true,
  },
  {
    value: "Passport",
    label: "Add to Apple Wallet",
    sub: "Verified status you can carry and share",
    accent: false,
  },
] as const;

export function TrustMetricsStrip() {
  return (
    <div>
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
        gap: "0.75rem", marginBottom: "1rem",
      }}>
        <div>
          <span style={{
            fontFamily: FONT, fontSize: "0.58rem", fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#3B82F6", padding: "0.25rem 0.55rem", borderRadius: 6,
            background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
          }}>
            Design partner phase
          </span>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.6, margin: "0.5rem 0 0", maxWidth: 520,
          }}>
            A focused registry with real assets and live booking rails. More partners onboarding as audits complete.
          </p>
        </div>
        <Link href="/metrics" style={{
          fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700,
          color: ACCENT, textDecoration: "none", whiteSpace: "nowrap",
        }}>
          Operator dashboard →
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
        gap: "0.85rem",
        marginBottom: "var(--section-gap, 2.5rem)",
      }}>
        {SIGNALS.map(signal => (
          <div key={signal.label} style={{
            padding: "1.1rem 1.2rem",
            borderRadius: 14,
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}>
            <div style={{
              fontFamily: "'Space Grotesk','Inter',sans-serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: signal.accent ? ACCENT : "var(--text-primary)",
              lineHeight: 1.05,
            }}>
              {signal.value}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>
              {signal.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
              {signal.sub}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "-1.5rem", marginBottom: "var(--section-gap, 2.5rem)" }}>
        <Btn href="/passport#apple-wallet" size="sm">Add to Apple Wallet →</Btn>
        <Btn href="#registry" variant="secondary" size="sm">Browse registry</Btn>
      </div>
    </div>
  );
}
