"use client";

import Link from "next/link";
import type { CanonicalWalletBindingStatus } from "@/lib/trust/readCanonicalWalletBinding";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";

const FONT = ABRAXAS_FONT_SANS;
const CARD = {
  background: PUBLIC_SURFACE.cardBackground,
  border: PUBLIC_SURFACE.cardBorder,
  borderRadius: PUBLIC_SURFACE.cardRadius,
  padding: PUBLIC_SURFACE.cardPadding,
  marginBottom: "1rem",
} as const;

export function PassportConnectionsCard({
  walletBindingStatus,
}: {
  walletBindingStatus: CanonicalWalletBindingStatus;
}) {
  const walletConnected = walletBindingStatus === "active";
  return (
    <section style={CARD} aria-labelledby="passport-connections-heading">
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)",
        letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 0.35rem",
      }}>
        Optional connections
      </p>
      <h2 id="passport-connections-heading" style={{
        fontFamily: FONT, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.35rem", color: "var(--text-primary)",
      }}>
        Use your Passport where it helps
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: "0 0 0.8rem",
      }}>
        Your Passport already works for verification. These optional paths add a connection only when a service needs one.
      </p>
      <div style={{ display: "grid", gap: "0.55rem" }}>
        <Link href="/passport?view=requests" style={{
          display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center",
          padding: "0.65rem 0.75rem", borderRadius: 10, border: "1px solid var(--border)",
          color: "var(--text-primary)", textDecoration: "none", fontFamily: FONT, fontSize: "0.8rem",
        }}>
          <span><strong>Review service requests</strong><br /><span style={{ color: "var(--text-secondary)" }}>Choose what a service may ask you to prove.</span></span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link href="/passport?view=activity" style={{
          display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center",
          padding: "0.65rem 0.75rem", borderRadius: 10, border: "1px solid var(--border)",
          color: "var(--text-primary)", textDecoration: "none", fontFamily: FONT, fontSize: "0.8rem",
        }}>
          <span><strong>See your activity</strong><br /><span style={{ color: "var(--text-secondary)" }}>Check which services used a result and when.</span></span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link href="/developers/integration-studio" style={{
          display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center",
          padding: "0.65rem 0.75rem", borderRadius: 10, border: "1px solid var(--border)",
          color: "var(--text-primary)", textDecoration: "none", fontFamily: FONT, fontSize: "0.8rem",
        }}>
          <span><strong>Build an optional connection</strong><br /><span style={{ color: "var(--text-secondary)" }}>{walletConnected ? "Wallet binding is connected; add a service rule when needed." : "Wallet, NFT collection, and payment paths stay optional."}</span></span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
