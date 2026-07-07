"use client";
// FILE: components/redesign/RevolutExperienceStrip.tsx

import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";
import {
  ContactlessPayIcon,
  VerifiedCheckIcon,
  WalletPassIcon,
} from "@/components/ui/WalletPassIcon";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import type { CapabilityStatus } from "@/lib/capabilityStatus";
import { Btn } from "./ui";
import type { ComponentType } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const CAPABILITIES: ReadonlyArray<{
  Icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  body: string;
  href: string;
  cta: string;
  status: CapabilityStatus;
}> = [
  {
    Icon: WalletPassIcon,
    title: "Passport in Apple Wallet",
    body: "Pilot pass for supported partner check-in. Status display only — partners verify via Abraxas API.",
    href: "/passport#apple-wallet",
    cta: "Add to Wallet",
    status: "pilot",
  },
  {
    Icon: ContactlessPayIcon,
    title: "Book with Apple Pay or card",
    body: "Genesis hospitality pilot — fiat checkout with USDC settlement on Sui under supervision.",
    href: "/flagship",
    cta: "Book Cielo",
    status: "pilot",
  },
  {
    Icon: VerifiedCheckIcon,
    title: "Verify once, reuse everywhere",
    body: "Public registry lookup and credential verification API — test without signing in.",
    href: "/verify",
    cta: "Run verifier",
    status: "live",
  },
];

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
          One passport. Verified assets. Proof at the moment of action.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.75, maxWidth: 620, margin: 0,
        }}>
          Sign in with Google, hold credentials in Passport (Wallet or browser QR), and let partners
          enforce policy — the verification layer does the hard work underneath.
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <c.Icon size={20} color={ACCENT} />
              </div>
              <CapabilityStatusBadge status={c.status} size="xs" />
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
        <Btn href="/passport#qr-verify" variant="secondary" size="sm">Browser QR flow</Btn>
        <Btn href="/account" variant="ghost" size="sm">My verified assets</Btn>
      </div>
    </section>
  );
}
