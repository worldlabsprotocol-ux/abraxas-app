"use client";
// FILE: components/redesign/VisualProofSection.tsx
// Live proof without repeating Cielo — one compact genesis card + diverse registry strip.

import Link from "next/link";
import { GenesisPilotCard } from "./GenesisPilotCard";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function VisualProofSection() {
  const thumbs = EXPLORE_ASSETS.filter(a => a.image);

  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Live proof
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          Real assets. One live pilot. Full registry below.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 620, margin: 0,
        }}>
          Cielo Sunrise is the genesis design-partner asset — end-to-end booking, verification, and payment.
          The public registry includes additional assets at different assurance levels.
        </p>
      </div>

      <GenesisPilotCard />

      {/* Diverse registry strip — larger cards */}
      <div style={{ marginTop: "1.5rem" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          Public registry preview
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.85rem",
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
                      objectPosition: asset.id === "genesis-asset" ? "78% center" : "center",
                    }}
                  />
                </div>
                <div style={{ padding: "0.75rem 0.85rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {asset.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {asset.location}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: ACCENT, marginTop: 6 }}>
                    {asset.primaryValue} · {asset.secondaryValue}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Btn href="#registry" size="sm">Browse full registry →</Btn>
          <Btn href="/verify?q=ABX-RE-HOSP-001" variant="secondary" size="sm">Run verifier</Btn>
        </div>
      </div>
    </section>
  );
}
