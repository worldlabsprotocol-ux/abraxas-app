"use client";
// FILE: components/redesign/WhatIsAbraxasSection.tsx
// Three-layer explainer — tightened copy.

import Link from "next/link";
import { PASSPORT_LAYERS } from "@/lib/passportLayers";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function WhatIsAbraxasSection() {
  return (
    <section style={{
      padding: "1.35rem 1.25rem",
      borderRadius: 18,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.65rem",
      }}>
        What is Abraxas?
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "clamp(1rem, 2.5vw, 1.1rem)", fontWeight: 700,
        color: "var(--text-primary)", lineHeight: 1.45, margin: "0 0 1rem", maxWidth: 580,
      }}>
        Portable eligibility and verification for permissioned on-chain finance — not a generic KYC vendor.
      </p>

      <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1rem" }}>
        {PASSPORT_LAYERS.map(layer => (
          <Link key={layer.id} href="/passport" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: "0.65rem", alignItems: "start",
              padding: "0.65rem 0.75rem", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              minHeight: 44,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {layer.title}
                  </span>
                  <ProductStatusBadge status={layer.status} size="xs" />
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {layer.tagline}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Create my passport →</Btn>
        <Btn href="/integrations" variant="ghost" size="sm">Partner verifier API</Btn>
      </div>
    </section>
  );
}
