"use client";
// FILE: components/home/HomeSharpHero.tsx
// Five-second homepage opener — one message, two actions.

import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeSharpHero() {
  return (
    <section id="top" aria-labelledby="home-hero-heading" style={{
      padding: "clamp(2.5rem, 6vw, 4rem) 0 clamp(2rem, 4vw, 3rem)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.65rem",
      }}>
        Abraxas
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)",
        lineHeight: 1.6, maxWidth: 520, margin: "0 0 1.25rem",
      }}>
        Verification infrastructure for real-world assets.
      </p>
      <h1 id="home-hero-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 900,
        letterSpacing: "-0.045em", lineHeight: 0.98,
        color: "var(--text-primary)", margin: "0 0 1rem", maxWidth: 640,
      }}>
        Verify once.
        <br />
        <span style={{ color: ACCENT }}>Use proof where it matters.</span>
      </h1>
      <p style={{
        fontFamily: FONT, fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
        color: "var(--text-primary)", lineHeight: 1.65,
        maxWidth: 560, margin: "0 0 1rem",
      }}>
        Abraxas lets people, wallets, and assets carry reusable verification — not document folders.
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 520, margin: "0 0 1.75rem",
      }}>
        A partner asks for a specific proof. You approve what gets shared. The policy engine returns a decision —
        approved, denied, or review required.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        <Btn href="/passport" size="lg">Create Passport →</Btn>
        <Btn href="/passport?view=verify" variant="secondary" size="lg">Verify a record →</Btn>
      </div>
    </section>
  );
}
