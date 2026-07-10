"use client";
// FILE: components/home/HomePartnersBrief.tsx
// Partner wedge — ask for the decision, not the document folder.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function HomePartnersBrief() {
  return (
    <section style={{
      padding: "clamp(1.5rem, 4vw, 2rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="partners-heading">
      <h2 id="partners-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.5rem", maxWidth: 520,
      }}>
        Ask for the eligibility decision — not the customer&apos;s document folder.
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 520, margin: "0 0 1rem",
      }}>
        Partners receive the minimum proof their policy requires: approved, denied, or review — with consent receipts, not raw KYC files.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/integrations" variant="secondary" size="sm">Integrations →</Btn>
        <Link href="/docs" style={{
          fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT,
          alignSelf: "center", textDecoration: "none",
        }}>
          Documentation →
        </Link>
      </div>
    </section>
  );
}
