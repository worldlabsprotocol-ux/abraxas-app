"use client";
// FILE: components/passport/SuiWalletCreatedCard.tsx
// Shown after zkLogin — explains the Sui wallet was created from Google sign-in.

import Link from "next/link";
import { truncateSuiAddress, toSuiDid } from "@/lib/sui/identity";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function SuiWalletCreatedCard({
  suiAddress,
  email,
}: {
  suiAddress: string;
  email?: string | null;
}) {
  return (
    <div style={{
      borderRadius: 16,
      overflow: "hidden",
      border: `1px solid ${ACCENT}44`,
      background: `linear-gradient(145deg, ${ACCENT}14 0%, var(--surface-raised) 55%)`,
    }}>
      <div style={{ padding: "1.25rem 1.35rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%", background: ACCENT, color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem",
          }}>✓</span>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Your Sui wallet is ready
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Created from your Google sign-in
            </div>
          </div>
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 520 }}>
          No seed phrase. No browser extension. Abraxas used <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>zkLogin</strong> to derive a Sui address tied to your Google account. This address holds your Passport and credentials.
        </p>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
          padding: "0.85rem 1rem", marginBottom: "0.75rem",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            Sui address
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)", wordBreak: "break-all" }}>
            {suiAddress}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
            {truncateSuiAddress(toSuiDid(suiAddress), 12, 8)}
          </div>
        </div>

        {email && (
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            Signed in as <span style={{ color: "var(--text-secondary)" }}>{email}</span>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Link href="/docs/sui" style={{
            padding: "0.45rem 0.9rem", borderRadius: 999, background: ACCENT, color: "#000",
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, textDecoration: "none",
          }}>
            How Sui works on Abraxas →
          </Link>
          <Link href={`/api/sui/passport?owner=${encodeURIComponent(suiAddress)}`} target="_blank"
            style={{
              padding: "0.45rem 0.9rem", borderRadius: 999, border: "1px solid var(--border)",
              color: ACCENT, fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none",
            }}>
            View on-chain data ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
