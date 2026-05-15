// FILE: lib/hooks/useWalletAuth.ts
// Level 1 — Wallet verification via signed message.
// Creates authenticated session: wallet address + timestamp + signature hash.
// Solana-native only. No Ethereum abstractions.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const AUTH_MSG  = "Verify wallet ownership for Abraxas Protocol";
const STORE_KEY = "abraxas_wallet_auth";

export interface WalletSession {
  wallet:    string;
  timestamp: number;
  sigHash:   string;       // first 16 bytes of signature as hex
  verified:  boolean;
}

export function useWalletAuth() {
  const { publicKey, connected, signMessage, disconnect } = useWallet();
  const [session,   setSession]  = useState<WalletSession | null>(null);
  const [verifying, setVerifying]= useState(false);
  const [error,     setError]    = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed: WalletSession = JSON.parse(raw);
      // Only restore if wallet matches and session is < 24h old
      if (
        publicKey &&
        parsed.wallet === publicKey.toBase58() &&
        Date.now() - parsed.timestamp < 86_400_000
      ) {
        setSession(parsed);
      }
    } catch { /* ignore */ }
  }, [publicKey]);

  // Clear session on disconnect
  useEffect(() => {
    if (!connected) {
      setSession(null);
      setError(null);
    }
  }, [connected]);

  const verify = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Wallet does not support message signing");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const encoded = new TextEncoder().encode(AUTH_MSG);
      const sig     = await signMessage(encoded);
      const sigHash = Array.from(sig.slice(0, 16))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      const newSession: WalletSession = {
        wallet:    publicKey.toBase58(),
        timestamp: Date.now(),
        sigHash,
        verified:  true,
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (e: unknown) {
      setError("Signature rejected — please sign to authenticate");
    } finally {
      setVerifying(false);
    }
  }, [publicKey, signMessage]);

  function clearSession() {
    localStorage.removeItem(STORE_KEY);
    setSession(null);
    disconnect();
  }

  return {
    session,
    isVerified: session?.verified ?? false,
    verifying,
    error,
    verify,
    clearSession,
  };
}