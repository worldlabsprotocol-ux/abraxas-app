// FILE: components/WalletGate.tsx
// Guards routes that require a connected Solana wallet.
// Shows connect prompt if no wallet — never crashes.
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/authState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

interface Props { children: React.ReactNode }

export function WalletGate({ children }: Props) {
  const { walletConnected } = useAuth();

  if (!walletConnected) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", margin: "0 auto 1.25rem", borderRadius: "50%", background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.4rem" }}>
          Connect your wallet
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
          This page requires a connected Solana wallet.
        </p>
        <div style={{ display: "inline-block", marginBottom: "1rem" }}>
          <ConnectWalletButton size="lg" />
        </div>
        <div>
          <Link href="/" style={{ fontSize: "0.72rem", color: "var(--subtle)", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}