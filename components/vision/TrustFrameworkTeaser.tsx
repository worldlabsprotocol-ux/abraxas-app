"use client";
// FILE: components/vision/TrustFrameworkTeaser.tsx
// Short homepage teaser — full claim stack lives on /trust-framework.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function TrustFrameworkTeaser() {
  return (
    <section aria-labelledby="trust-teaser-heading">
      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          Verification standards
        </div>
        <h2 id="trust-teaser-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.15,
          color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 620,
        }}>
          Verification is claim-based, not a single badge
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 640, margin: "0 0 1rem",
        }}>
          Identity, wallet control, sanctions, investor eligibility, business ownership, asset evidence,
          and transfer permission are independently issued, time-bound claims.
        </p>
        <Btn href="/trust-framework" size="md">View Abraxas Trust Framework →</Btn>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>
        <Link href="/trust-framework" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
          Full decision-domain table →
        </Link>
      </p>
    </section>
  );
}
