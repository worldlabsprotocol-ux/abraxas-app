"use client";
// FILE: components/redesign/HomeVerifyOnceSection.tsx
// User benefit band — separate from technical protocol explanation.

import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeVerifyOnceSection() {
  return (
    <section
      id="verify-once"
      aria-labelledby="verify-once-heading"
      style={{
        padding: "clamp(2rem, 5vw, 3rem) 0",
        borderBottom: "1px solid var(--border-strong)",
        background: "linear-gradient(180deg, rgba(16,185,129,0.04) 0%, transparent 100%)",
      }}
    >
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        Verify once
      </div>
      <h2 id="verify-once-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", lineHeight: 1.15,
        color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 560,
      }}>
        Portable eligibility for participating Abraxas applications
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 560, margin: "0 0 1.25rem",
      }}>
        Sign in once, bind your wallet, and reuse proof across pilots — ID verification only when a partner policy requires it.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        <Btn href="/passport" size="lg">Create Passport</Btn>
        <Btn href="/verify" variant="secondary" size="lg">Verify a record</Btn>
      </div>
    </section>
  );
}
