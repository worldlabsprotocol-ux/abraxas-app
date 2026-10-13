"use client";
// FILE: components/sui/PassportWalletSignInButton.tsx

import { useCallback, useEffect, useState } from "react";
import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import { useSuiAuth } from "./SuiAuthProvider";
import {
  SuiWalletStandardConnect,
  type HolderWalletConnection,
} from "./SuiWalletStandardConnect";
import { signInWithPassportWallet } from "@/lib/auth/passportWalletAuth/client/signInWithPassportWallet";
import { PASSPORT_WALLET_ACTIONS } from "@/lib/auth/passportWalletAuth/contract";
import { filterSuiCompatibleWallets } from "@/lib/sui/walletStandard/discoverSuiWallets";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function PassportWalletSignInButton({
  intendedAction = PASSPORT_WALLET_ACTIONS.passportSignIn,
  compact = false,
  onSuccess,
}: {
  intendedAction?: typeof PASSPORT_WALLET_ACTIONS.passportSignIn | typeof PASSPORT_WALLET_ACTIONS.partnerVerify;
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const { establishWalletPassportSession } = useSuiAuth();
  const [connection, setConnection] = useState<HolderWalletConnection | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) {
      setWallet(null);
      return;
    }
    const found = filterSuiCompatibleWallets(getWallets().get()).find((w) => w.name === connection.walletName) ?? null;
    setWallet(found);
  }, [connection]);

  const authenticate = useCallback(async () => {
    if (!connection || !wallet) {
      setError("Connect a Sui wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithPassportWallet({
        wallet,
        connection,
        intendedAction,
      });
      if (!result.ok) {
        setError(result.detail ?? result.code);
        return;
      }
      establishWalletPassportSession(result.suiAddress);
      onSuccess?.();
    } finally {
      setBusy(false);
    }
  }, [connection, wallet, intendedAction, establishWalletPassportSession, onSuccess]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <SuiWalletStandardConnect compact={compact} onConnectionChange={setConnection} />
      {connection ? (
        <button
          type="button"
          disabled={busy || !wallet}
          onClick={() => void authenticate()}
          style={{
            padding: compact ? "0.55rem 0.85rem" : "0.65rem 1rem",
            borderRadius: 10,
            border: "none",
            background: "#4CBB92",
            color: "#04110c",
            fontFamily: FONT,
            fontSize: compact ? "0.78rem" : "0.82rem",
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.8 : 1,
          }}
        >
          {busy ? "Authenticating…" : "Sign in with wallet"}
        </button>
      ) : null}
      {error ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#E0524F", margin: 0, lineHeight: 1.5 }}>{error}</p>
      ) : null}
    </div>
  );
}
