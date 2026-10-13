"use client";
// FILE: components/auth/HolderSignInPanel.tsx
// Wallet-first sign-in with legacy Google path when rollout flag is on.

import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { WalletFirstSignIn } from "@/components/auth/WalletFirstSignIn";
import { isWalletFirstAuthEnabledClient } from "@/lib/auth/walletLogin/clientFeatureFlag";
import { useHolderSession } from "@/lib/hooks/useHolderSession";

export function HolderSignInPanel(props: { continuePath?: string | null }) {
  const walletFirst = isWalletFirstAuthEnabledClient();
  const { session, refresh } = useHolderSession(walletFirst);

  if (!walletFirst) {
    return <ZkLoginSignIn />;
  }

  if (session?.loginMethod === "solana_wallet") {
    return (
      <div style={{
        padding: "1rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
      >
        <p style={{ margin: "0 0 0.35rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Wallet connected
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {session.passportSubjectReady
            ? "Your Passport account is linked. Refresh if content does not update."
            : "Wallet sign-in is active. Identity verification and Sui-backed Passport steps still require completing or linking your Abraxas account — wallet possession alone is not verified identity."}
        </p>
        {!session.passportSubjectReady ? (
          <div style={{ marginTop: "0.75rem" }}>
            <ZkLoginSignIn />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <WalletFirstSignIn
        continuePath={props.continuePath}
        onSuccess={() => void refresh()}
      />
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
        <p style={{
          margin: "0 0 0.5rem",
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
        >
          Existing Abraxas account
        </p>
        <ZkLoginSignIn />
      </div>
    </div>
  );
}
