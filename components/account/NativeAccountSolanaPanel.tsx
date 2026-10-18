"use client";
// FILE: components/account/NativeAccountSolanaPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Btn } from "@/components/redesign/ui";
import { SolanaAccountSignInDialog } from "@/components/nav/SolanaAccountSignInDialog";

type SessionState =
  | { loading: true }
  | { loading: false; authenticated: false; authMode: "native" | "ephemeral_wallet" | null }
  | {
      loading: false;
      authenticated: true;
      authMode: "native" | "ephemeral_wallet";
      accountId: string | null;
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
      const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
      const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
      const ephemeral = enabledJson.auth_mode === "ephemeral_wallet";
      const sessionUrl = ephemeral ? "/api/auth/wallet/session" : "/api/auth/native/session";
      const res = await fetch(sessionUrl, { credentials: "same-origin" });
      const body = (await res.json()) as {
        authenticated?: boolean;
        account_id?: string;
        auth_method?: string;
        wallet_address?: string | null;
        solana_network?: string | null;
        session_id?: string;
      };
      if (!body.authenticated) {
        setSession({
          loading: false,
          authenticated: false,
          authMode: ephemeral ? "ephemeral_wallet" : "native",
        });
        return;
      }
      setSession({
        loading: false,
        authenticated: true,
        authMode: ephemeral ? "ephemeral_wallet" : "native",
        accountId: ephemeral ? body.session_id ?? null : body.account_id ?? null,
        authMethod: body.auth_method ?? "solana_wallet",
        walletAddress: body.wallet_address ?? null,
        solanaNetwork: body.solana_network ?? null,
      });
    } catch {
      setSession({ loading: false, authenticated: false, authMode: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onSession = () => void refresh();
    window.addEventListener("abraxas:native-account-session", onSession);
    window.addEventListener("abraxas:wallet-session", onSession);
    return () => {
      window.removeEventListener("abraxas:native-account-session", onSession);
      window.removeEventListener("abraxas:wallet-session", onSession);
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    const url =
      session.loading === false && session.authenticated && session.authMode === "ephemeral_wallet"
        ? "/api/auth/wallet/session"
        : "/api/auth/native/session";
    await fetch(url, { method: "DELETE", credentials: "same-origin" });
    await refresh();
    onSuccess?.();
  }, [refresh, onSuccess, session]);

  if (session.loading) {
    return <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading account…</p>;
  }

  if (!session.authenticated) {
    return (
      <>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Sign in with your Solana wallet to open a temporary sandbox or integration tools. Ephemeral sign-in does
          not create a permanent personal account.
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
  const ephemeral = session.authMode === "ephemeral_wallet";
  const startHref = ephemeral ? "/developers/ephemeral-sandbox" : "/developers/launchpad";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>Signed in.</strong> Solana {networkLabel} · {walletLabel}
      </p>
      {ephemeral ? (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Ephemeral session — expires automatically. No durable personal profile.
        </p>
      ) : session.accountId ? (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Account {session.accountId.slice(0, 16)}…
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href={startHref} size="sm">
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
