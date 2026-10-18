"use client";
// FILE: components/account/NativeAccountSolanaPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Btn } from "@/components/redesign/ui";
import { SolanaAccountSignInDialog } from "@/components/nav/SolanaAccountSignInDialog";

type SessionState =
  | { loading: true }
  | { loading: false; authenticated: false }
  | {
      loading: false;
      authenticated: true;
      accountId: string;
      authMethod: string;
      walletAddress: string | null;
      solanaNetwork: string | null;
    };

export function NativeAccountSolanaPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { publicKey } = useWallet();
  const [session, setSession] = useState<SessionState>({ loading: true });
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/native/session", { credentials: "same-origin" });
      const body = (await res.json()) as {
        authenticated?: boolean;
        account_id?: string;
        auth_method?: string;
        wallet_address?: string | null;
        solana_network?: string | null;
      };
      if (!body.authenticated || !body.account_id) {
        setSession({ loading: false, authenticated: false });
        return;
      }
      setSession({
        loading: false,
        authenticated: true,
        accountId: body.account_id,
        authMethod: body.auth_method ?? "solana_wallet",
        walletAddress: body.wallet_address ?? null,
        solanaNetwork: body.solana_network ?? null,
      });
    } catch {
      setSession({ loading: false, authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onSession = () => void refresh();
    window.addEventListener("abraxas:native-account-session", onSession);
    return () => window.removeEventListener("abraxas:native-account-session", onSession);
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/native/session", { method: "DELETE", credentials: "same-origin" });
    await refresh();
    onSuccess?.();
  }, [refresh, onSuccess]);

  if (session.loading) {
    return <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading account…</p>;
  }

  if (!session.authenticated) {
    return (
      <>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Sign in with your Solana wallet to open sandbox workspaces, API credentials, and integration tools.
        </p>
        <Btn size="sm" onClick={() => setSignInOpen(true)}>
          Sign in
        </Btn>
        {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem" }}>{error}</p> : null}
        <SolanaAccountSignInDialog
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSuccess={() => {
            void refresh();
            onSuccess?.();
          }}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
        />
      </>
    );
  }

  const linkedWallet = session.walletAddress;
  const walletLabel = linkedWallet
    ? `${linkedWallet.slice(0, 4)}…${linkedWallet.slice(-4)}`
    : publicKey
      ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
      : "Wallet not connected in browser";
  const networkLabel = session.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>Signed in.</strong> Solana {networkLabel} · {walletLabel}
      </p>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
        Account {session.accountId.slice(0, 16)}…
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/developers/launchpad" size="sm">
          Start building
        </Btn>
        <Btn href="/pricing" variant="secondary" size="sm">
          Integrate with my business
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign out
        </Btn>
      </div>
    </div>
  );
}
