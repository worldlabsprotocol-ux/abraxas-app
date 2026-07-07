"use client";
// FILE: components/redesign/VisualProofSection.tsx
// Registry-first live proof — text cards, no photo grid.

import Link from "next/link";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { VERIFY_META } from "@/lib/data/exploreAssets";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function VisualProofSection() {
  return (
    <section style={{ paddingTop: "0.75rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Live proof
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 560,
        }}>
          A multi-asset registry — not a single-property site
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.75, maxWidth: 620, margin: 0,
        }}>
          Hospitality, residential, international, and reference assets at different assurance levels.
          One genesis pilot runs end-to-end booking with Apple Pay.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "0.85rem",
      }}>
        {EXPLORE_ASSETS.map(asset => {
          const meta = VERIFY_META[asset.state];
          return (
            <Link key={asset.id} href={asset.href ?? "#registry"}
              style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                borderRadius: 14, padding: "1rem 1.05rem",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                height: "100%",
                display: "flex", flexDirection: "column", gap: "0.55rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: meta.color, padding: "0.15rem 0.45rem", borderRadius: 999,
                    border: `1px solid ${meta.color}44`, background: `${meta.color}12`,
                  }}>
                    {meta.label}
                  </span>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.58rem", fontWeight: 600,
                    color: "var(--text-muted)", textAlign: "right",
                  }}>
                    {asset.assetClass.split(" · ")[0]}
                  </span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {asset.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {asset.location}
                </div>
                <div style={{
                  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT,
                  marginTop: "auto", paddingTop: "0.5rem",
                  borderTop: "1px solid var(--border)",
                }}>
                  {asset.primaryValue} · {asset.secondaryValue}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <Btn href="#registry" size="sm">Browse full registry →</Btn>
        <Btn href="/verify" variant="secondary" size="sm">Run verifier</Btn>
      </div>
    </section>
  );
}
