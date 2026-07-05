"use client";
// FILE: components/redesign/PassportInnovationSection.tsx
// Core thesis: verify-once identity — the zkLogin + credential innovation.

import Link from "next/link";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const VIOLET = "#8B5CF6";

const INNOVATION_POINTS = [
  {
    label: "The problem we solve",
    text: "Every app makes you re-upload your ID. Abraxas verifies once, stores only the outcome, and gives you portable proof other apps can check.",
  },
  {
    label: "How sign-in works",
    text: "Google zkLogin → Sui wallet in one click. No browser extension, no 12-word seed phrase. That plumbing is the hard part — and it's live on /passport.",
  },
  {
    label: "How ID check works",
    text: "Optional Veriff check when you need enhanced trust. Abraxas never holds your documents — only a signed credential other parties can verify via API.",
  },
  {
    label: "Why it matters for funding",
    text: "If verify-once identity works at scale, every RWA marketplace and lender becomes a customer. The asset photos prove we ship; the passport proves the moat.",
  },
] as const;

export function PassportInnovationSection() {
  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: VIOLET, marginBottom: "0.5rem",
        }}>
          Core innovation · verify once
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: 0, maxWidth: 560,
        }}>
          The product is your Passport — not another marketplace.
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1rem",
      }}>
        <div style={{
          padding: "1.25rem", borderRadius: 16,
          border: `1px solid ${VIOLET}44`, background: `${VIOLET}0A`,
        }}>
          {INNOVATION_POINTS.map(p => (
            <div key={p.label} style={{ marginBottom: "1rem" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: VIOLET, marginBottom: 4 }}>
                {p.label}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {p.text}
              </p>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Btn href="/passport" size="sm">Open Passport →</Btn>
            <Btn href="/passport#apple-wallet" variant="secondary" size="sm">Add to Apple Wallet</Btn>
            <Btn href="/docs/sui" variant="ghost" size="sm">zkLogin docs</Btn>
          </div>
        </div>

        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)",
        }}>
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT }}>Live flow</span>
            <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)" }}>/passport</span>
          </div>
          <ol style={{
            margin: 0, padding: "1rem 1rem 1rem 1.35rem",
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.85,
          }}>
            <li><strong style={{ color: "var(--text-primary)" }}>Sign in with Google</strong> — wallet created via zkLogin</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Pay with Apple Pay</strong> — or USDC on Sui when ready</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Add to Apple Wallet</strong> — carry verified status natively</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Optional ID check</strong> — Veriff when a deal needs it</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Credential issued</strong> — W3C JWT, reusable proof</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Partner verifies</strong> — POST /api/credentials/verify</li>
          </ol>
          <div style={{ padding: "0 1rem 1rem" }}>
            <Link href="/integrations/relying-parties" style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
              Relying party integration →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
