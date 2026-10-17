"use client";
// FILE: components/passport/SolanaWalletConnectButton.tsx

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function SolanaWalletConnectButton() {
  const { connect, connected, connecting, wallet } = useWallet();
  const [error, setError] = useState<string | null>(null);

  if (connected) return null;

  if (!wallet) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
        Install a Solana wallet extension (Phantom or Solflare), then return here to connect.
      </p>
    );
  }

  return (
    <div style={{ marginBottom: "0.35rem" }}>
      <button
        type="button"
        disabled={connecting}
        onClick={() => {
          setError(null);
          void connect().catch(() => setError("Could not connect Solana wallet. Confirm the extension is unlocked."));
        }}
        style={{
          padding: "0.55rem 0.85rem",
          borderRadius: 10,
          border: "1px solid var(--border-subtle, #333)",
          background: "transparent",
          color: "var(--text-primary, #fff)",
          fontFamily: FONT,
          fontWeight: 600,
          cursor: connecting ? "wait" : "pointer",
          width: "100%",
        }}
      >
        {connecting ? "Connecting…" : wallet ? "Connect Solana wallet" : "Select Solana wallet"}
      </button>
      {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem", margin: "0.25rem 0 0" }}>{error}</p> : null}
    </div>
  );
}
