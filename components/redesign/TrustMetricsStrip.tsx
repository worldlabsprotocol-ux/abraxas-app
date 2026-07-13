"use client";
// FILE: components/redesign/TrustMetricsStrip.tsx
// Honest early-access banner — no zero counters or signal cards on the homepage.

import Link from "next/link";
import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function TrustMetricsStrip() {
  return (
    <div style={{
      padding: "1.35rem 1.25rem",
      borderRadius: 16,
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      marginBottom: "var(--section-gap, 2.5rem)",
    }}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
      }}>
        <div style={{ flex: "1 1 280px", maxWidth: 560 }}>
          <span style={{
            fontFamily: FONT,
            fontSize: "0.58rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#3B82F6",
            padding: "0.25rem 0.55rem",
            borderRadius: 6,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.25)",
          }}>
            Active partners
          </span>
          <h2 style={{
            fontFamily: FONT,
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            margin: "0.65rem 0 0.45rem",
            lineHeight: 1.2,
          }}>
            Live registry — Cielo + Grady County 270 land partner
          </h2>
          <p style={{
            fontFamily: FONT,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: 0,
          }}>
            ~$2.7M in verified assets on Abraxas: Cielo Sunrise live STR plus Grady County 270 — 270 acres, surveys, drone footage, contracts at asking.
          </p>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.5rem",
          flexShrink: 0,
        }}>
          <Link href="/metrics" style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            fontWeight: 700,
            color: ACCENT,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}>
            See live metrics →
          </Link>
          <AddToAppleWalletButton href="/passport#apple-wallet" variant="primary" size="sm">
            Add to Apple Wallet
          </AddToAppleWalletButton>
        </div>
      </div>
    </div>
  );
}
