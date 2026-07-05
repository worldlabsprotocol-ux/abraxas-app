"use client";
// FILE: components/redesign/RevolutExperienceStrip.tsx
// Revolut for RWAs — Apple Wallet identity + Apple Pay checkout.

import Link from "next/link";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const CAPABILITIES = [
  {
    icon: "🪪",
    title: "Passport in Apple Wallet",
    body: "Your verified status as a native pass — QR links to the public verifier.",
    href: "/passport",
    cta: "Add to Wallet",
  },
  {
    icon: "🍎",
    title: "Pay with Apple Pay / card",
    body: "Book Cielo with fiat — converts to USDC on Sui. No manual wallet setup.",
    href: "/flagship",
    cta: "Book a stay",
  },
  {
    icon: "✓",
    title: "Verify once, reuse everywhere",
    body: "Partners check your credential via API — no repeated document uploads.",
    href: "/verify",
    cta: "Run verifier",
  },
] as const;

export function RevolutExperienceStrip() {
  return (
    <section aria-labelledby="revolut-experience-heading">
      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Revolut for RWAs
        </div>
        <h2 id="revolut-experience-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          Hide the rails. Keep the trust.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 620, margin: 0,
        }}>
          Sign in with Google, carry your passport in Apple Wallet, and pay with Apple Pay —
          without thinking about chains, gas, or bridges.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "0.75rem",
      }}>
        {CAPABILITIES.map(c => (
          <div key={c.title} style={{
            padding: "1.1rem", borderRadius: 16,
            background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            <div style={{ fontSize: "1.25rem", lineHeight: 1 }}>{c.icon}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {c.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, flex: 1 }}>
              {c.body}
            </p>
            <Link href={c.href} style={{
              fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700,
              color: ACCENT, textDecoration: "none",
            }}>
              {c.cta} →
            </Link>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Create passport →</Btn>
        <Btn href="/account" variant="secondary" size="sm">My account</Btn>
      </div>
    </section>
  );
}
