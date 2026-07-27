"use client";
// FILE: app/build/page.tsx
// Tokenize on Abraxas — owner intake aligned with institutional homepage.

import Link from "next/link";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

const STEPS = [
  { n: "1", title: "Tell us what you own", body: "Property, fund, inventory, IP — we map the asset class and jurisdiction." },
  { n: "2", title: "Verify once on Passport", body: "Owner ID + docs through Abraxas. Partners see proof, not your files." },
  { n: "3", title: "On-registry + tokenize", body: "Reference record, compliance stamps, and token rails when policy allows." },
];

export default function BuildPage() {
  return (
    <RedesignShell>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 3vw, 1.5rem)" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: "0.5rem" }}>
          Tokenize
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 0.75rem" }}>
          Put your asset on-registry
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 2rem", maxWidth: 560 }}>
          Abraxas is the verify layer first — then tokenization. You prove ownership once; buyers and partners check the record instead of re-running diligence.
        </p>

        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
          {STEPS.map(step => (
            <div key={step.n} style={{
              display: "flex", gap: "0.85rem", alignItems: "flex-start",
              padding: "1rem 1.1rem", borderRadius: 14,
              background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${ACCENT}22`, color: ACCENT, fontFamily: MONO, fontSize: "0.72rem", fontWeight: 800,
              }}>
                {step.n}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {step.title}
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "1.25rem 1.35rem", borderRadius: 16,
          background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, transparent 100%)",
          border: "1px solid rgba(16,185,129,0.3)",
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Start with Passport
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
            Complete owner verification first (name + ID + selfie). Then our team scopes your asset for registry + tokenization.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href="/passport" size="sm">Open Passport →</Btn>
            <Btn href="/design-partner" variant="secondary" size="sm">Design partner intake →</Btn>
          </div>
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          API keys and agent integrations are for{" "}
          <Link href="/design-partner" style={{ color: ACCENT }}>design partners</Link>
          {" "}building apps on Abraxas — not required for asset owners.
        </p>
      </div>
      <RedesignFooter />
    </RedesignShell>
  );
}
