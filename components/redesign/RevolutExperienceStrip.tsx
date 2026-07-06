"use client";
// FILE: components/redesign/RevolutExperienceStrip.tsx

import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";
import {
  ContactlessPayIcon,
  VerifiedCheckIcon,
  WalletPassIcon,
} from "@/components/ui/WalletPassIcon";
import { Btn } from "./ui";
import type { ComponentType } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const CAPABILITIES = [
  {
    Icon: WalletPassIcon,
    title: "Passport in Apple Wallet",
    body: "Your verified status as a native pass — show it anywhere partners accept Abraxas proof.",
    href: "/passport#apple-wallet",
    cta: "Add to Wallet",
  },
  {
    Icon: ContactlessPayIcon,
    title: "Pay with Apple Pay / card",
    body: "Book verified stays in your currency. Conversion happens in checkout — you never manage a wallet.",
    href: "/#registry",
    cta: "Browse & book",
  },
  {
    Icon: VerifiedCheckIcon,
    title: "Verify once, reuse everywhere",
    body: "Partners check your credential — no repeated document uploads at every marketplace.",
    href: "/verify",
    cta: "Run verifier",
  },
] as const satisfies ReadonlyArray<{
  Icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  body: string;
  href: string;
  cta: string;
}>;

export function RevolutExperienceStrip() {
  return (
    <section aria-labelledby="revolut-experience-heading" style={{ paddingTop: "0.25rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          How it should feel
        </div>
        <h2 id="revolut-experience-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          One app. Verified assets. Apple-native checkout.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.75, maxWidth: 620, margin: 0,
        }}>
          Sign in with Google, add your passport to Apple Wallet, and pay with Apple Pay —
          the verification layer does the hard work underneath.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.15rem",
      }}>
        {CAPABILITIES.map(c => (
          <a key={c.title} href={c.href} style={{
            padding: "1.25rem", borderRadius: 16, textDecoration: "none", color: "inherit",
            background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
            display: "flex", flexDirection: "column", gap: "0.65rem",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <c.Icon size={20} color={ACCENT} />
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {c.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0, flex: 1 }}>
              {c.body}
            </p>
            <span style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT }}>
              {c.cta} →
            </span>
          </a>
        ))}
      </div>

      <div style={{ marginTop: "1.35rem", display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
        <AddToAppleWalletButton href="/passport#apple-wallet" variant="primary" size="sm">
          Add to Apple Wallet
        </AddToAppleWalletButton>
        <Btn href="/account" variant="secondary" size="sm">My verified assets</Btn>
      </div>
    </section>
  );
}
