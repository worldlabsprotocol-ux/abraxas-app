"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/lib/authState";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** If true, renders a minimal icon-only button for tight spaces like the nav */
  compact?: boolean;
}

function WalletIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

/**
 * Compact wallet button for use in the nav.
 * Shows just a small styled button that opens the wallet modal.
 */
function CompactWalletButton() {
  const { connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { walletAddress } = useAuth();

  if (connected && walletAddress) {
    return (
      <button
        onClick={() => disconnect()}
        style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          background: "rgba(61,214,140,0.08)",
          border: "1px solid rgba(61,214,140,0.25)",
          borderRadius: "6px",
          padding: "0.3rem 0.6rem",
          cursor: "pointer",
          color: "var(--green)",
          fontSize: "0.6rem",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
          maxWidth: "90px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          transition: "all 0.2s",
        }}
        title={`Disconnect wallet`}
      >
        <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", flexShrink: 0, animation: "pulse 2s ease-in-out infinite" }} />
        {walletAddress}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "6px",
        padding: "0.3rem 0.625rem",
        cursor: "pointer",
        color: "var(--muted)",
        fontSize: "0.62rem",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        whiteSpace: "nowrap",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.4)";
        (e.currentTarget as HTMLElement).style.color = "var(--gold)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
        (e.currentTarget as HTMLElement).style.color = "var(--muted)";
      }}
    >
      <WalletIcon />
      Connect
    </button>
  );
}

export function ConnectWalletButton({ size = "md", className = "", compact = false }: Props) {
  if (compact) {
    return <CompactWalletButton />;
  }

  // Full-size version for login page / non-nav contexts
  return (
    <div className={`abx-wallet abx-wallet-${size} ${className}`} style={{ width: "100%" }}>
      <WalletMultiButtonDynamic />
    </div>
  );
}