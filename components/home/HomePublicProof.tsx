"use client";
// FILE: components/home/HomePublicProof.tsx
// One registry proof card + test link — not full catalog.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomePublicProof() {
  return (
    <section id="test-network" style={{
      padding: "clamp(2rem, 5vw, 3rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="public-proof-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        Public verification
      </div>
      <h2 id="public-proof-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.65rem",
      }}>
        Every record has a public status trail
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 560, margin: "0 0 1.25rem",
      }}>
        Status, verification scope, assurance level, issuer trail, and review date — no login required.
      </p>
      <div style={{
        padding: "1.15rem 1.25rem", borderRadius: 16,
        background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
        marginBottom: "1rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          Cielo Sunrise
        </div>
        <code style={{ fontFamily: MONO, fontSize: "0.72rem", color: ACCENT }}>ABX-RE-HOSP-001</code>
        <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.75rem" }}>
          {[
            ["Status", "Resolved valid"],
            ["Assurance", "L3"],
            ["Scope", "Ownership review · appraisal · listing cross-check"],
          ].map(([k, v]) => (
            <div key={k} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{k}:</strong> {v}
            </div>
          ))}
        </div>
        <Link href="/verify/ABX-RE-HOSP-001" style={{
          display: "inline-block", marginTop: "0.85rem",
          fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
        }}>
          Public record →
        </Link>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport?view=verify" variant="secondary" size="sm">Test the network →</Btn>
        <Btn href="/verify" variant="ghost" size="sm">Verify reference records →</Btn>
      </div>
    </section>
  );
}
