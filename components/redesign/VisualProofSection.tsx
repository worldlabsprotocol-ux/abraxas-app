"use client";
// FILE: components/redesign/VisualProofSection.tsx
// Registry-first live proof — no duplicate genesis card.

import Link from "next/link";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function VisualProofSection() {
  const thumbs = EXPLORE_ASSETS.filter(a => a.image);

  return (
    <section style={{ paddingTop: "0.5rem" }}>
      <div style={{ marginBottom: "1.75rem" }}>
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
        gap: "1rem",
      }}>
        {thumbs.map(asset => (
          <Link key={asset.id} href={asset.href ?? "#registry"}
            style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              borderRadius: 16, overflow: "hidden",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              height: "100%",
            }}>
              <div style={{ position: "relative", aspectRatio: "16/10", background: "#06090B" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.image}
                  alt={asset.name}
                  style={{
                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                    objectPosition: asset.id === "genesis-asset" ? "center 35%" : "center",
                  }}
                />
              </div>
              <div style={{ padding: "0.9rem 1rem" }}>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {asset.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {asset.location}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, marginTop: 8 }}>
                  {asset.primaryValue} · {asset.secondaryValue}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <Btn href="#registry" size="sm">Browse full registry →</Btn>
        <Btn href="/verify" variant="secondary" size="sm">Run verifier</Btn>
      </div>
    </section>
  );
}
