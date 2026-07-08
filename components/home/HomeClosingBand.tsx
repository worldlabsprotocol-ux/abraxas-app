"use client";
// FILE: components/home/HomeClosingBand.tsx

import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function HomeClosingBand() {
  return (
    <section style={{
      padding: "clamp(2.5rem, 5vw, 3.5rem) 0",
      borderTop: "1px solid var(--border-strong)",
      marginBottom: "1rem",
    }}>
      <h2 style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 900,
        letterSpacing: "-0.03em", lineHeight: 1.1,
        color: "var(--text-primary)", margin: "0 0 0.65rem",
      }}>
        Verify once. <span style={{ color: ACCENT }}>Transact everywhere.</span>
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 520, margin: "0 0 1.25rem",
      }}>
        Real-world assets need proof that can move with the transaction.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="md">Create Passport →</Btn>
        <Btn href="/#registry" variant="secondary" size="md">Browse registry →</Btn>
        <Btn href="/passport?view=verify" variant="ghost" size="md">Verify a record →</Btn>
      </div>
    </section>
  );
}
