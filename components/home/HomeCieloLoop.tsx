"use client";
// FILE: components/home/HomeCieloLoop.tsx

import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const STEPS = [
  "Browse the asset",
  "Create a Passport",
  "Bind your wallet",
  "Consent to the policy",
  "Request a verified rate",
];

export function HomeCieloLoop() {
  return (
    <section style={{
      padding: "clamp(2rem, 5vw, 3rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="cielo-loop-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        The first live loop
      </div>
      <h2 id="cielo-loop-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.65rem",
      }}>
        Cielo is the first Abraxas access loop
      </h2>
      <ol style={{ margin: "0 0 1rem", paddingLeft: "1.2rem" }}>
        {STEPS.map(s => (
          <li key={s} style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 4 }}>
            {s}
          </li>
        ))}
      </ol>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
        lineHeight: 1.6, maxWidth: 560, margin: "0 0 1.25rem",
      }}>
        The Passport does not guarantee a reservation. It proves whether a guest meets the current policy for that request.
      </p>
      <Btn href="/cielo/verified-rate" size="md">Open Cielo verified rate →</Btn>
    </section>
  );
}
