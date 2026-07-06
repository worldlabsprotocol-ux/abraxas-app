"use client";
// FILE: components/redesign/PassportInnovationSection.tsx

import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const VIOLET = "#8B5CF6";
const ACCENT = "#10B981";

const INNOVATION_POINTS = [
  {
    label: "The problem we solve",
    text: "Every app makes you re-upload your ID. Abraxas verifies once and gives you portable proof other apps can check.",
  },
  {
    label: "How sign-in works",
    text: "Sign in with Google — your account and wallet are ready in one click. No seed phrase, no browser extension.",
  },
  {
    label: "How ID check works",
    text: "Optional identity check when a deal needs more trust. Abraxas stores only the outcome — never your documents.",
  },
  {
    label: "Why it matters",
    text: "If verify-once identity works at scale, every marketplace and lender becomes a customer. That's the moat.",
  },
] as const;

export function PassportInnovationSection() {
  return (
    <section style={{ paddingTop: "0.25rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: VIOLET, marginBottom: "0.5rem",
        }}>
          Core innovation · verify once
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: 0, maxWidth: 560,
        }}>
          The product is your Passport — not another marketplace.
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1.25rem",
      }}>
        <div style={{
          padding: "1.35rem", borderRadius: 16,
          border: `1px solid ${VIOLET}44`, background: `${VIOLET}0A`,
        }}>
          {INNOVATION_POINTS.map(p => (
            <div key={p.label} style={{ marginBottom: "1.1rem" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: VIOLET, marginBottom: 4 }}>
                {p.label}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {p.text}
              </p>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
            <AddToAppleWalletButton href="/passport#apple-wallet" variant="primary" size="sm">
              Add to Apple Wallet
            </AddToAppleWalletButton>
            <Btn href="/passport" variant="secondary" size="sm">Open Passport</Btn>
          </div>
        </div>

        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)",
        }}>
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT }}>Your flow</span>
          </div>
          <ol style={{
            margin: 0, padding: "1.15rem 1rem 1.15rem 1.4rem",
            fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.9,
          }}>
            <li><strong style={{ color: "var(--text-primary)" }}>Sign in with Google</strong></li>
            <li><strong style={{ color: "var(--text-primary)" }}>Browse & book</strong> — no ID to start</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Pay with Apple Pay</strong> when ready</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Add to Apple Wallet</strong> — carry proof</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Partners verify</strong> — no re-upload</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
