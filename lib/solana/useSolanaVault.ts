// FILE: lib/solana/useSolanaVault.ts
// Client-side hook that wires wallet → transaction → on-chain confirmation.
// Integrates with vaultEngine.ts (updates local state after on-chain confirmation).
// All external tx calls go through /api/vault/* — never direct from client.

"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { createVault, triggerRiskEvent } from "@/lib/vaultEngine";

export type TxPhase =
  | "idle"
  | "building"
  | "simulating"
  | "awaiting_signature"
  | "sending"
  | "confirmed"
  | "error";

export interface TxResult {
  signature:   string;
  explorerUrl: string;
  simulated:   boolean;
}

export interface SolanaVaultState {
  phase:     TxPhase;
  error:     string | null;
  lastTx:    TxResult | null;
  liveMode:  boolean;
  setLiveMode: (v: boolean) => void;
  createVaultOnChain: (strategy: string, assetIdx?: number) => Promise<void>;
  triggerEventOnChain:(vaultId: string, pda: string, riskScore: number, strategy: string) => Promise<void>;
  reset: () => void;
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export function useSolanaVault(): SolanaVaultState {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [phase,    setPhase]    = useState<TxPhase>("idle");
  const [error,    setError]    = useState<string | null>(null);
  const [lastTx,   setLastTx]   = useState<TxResult | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle"); setError(null);
  }, []);

  // ── Create vault on-chain + update local state ────────────────────────────
  const createVaultOnChain = useCallback(async (strategy: string, assetIdx?: number) => {
    if (!liveMode || !connected || !publicKey || !signTransaction) {
      // Simulation mode — instant local state
      createVault(strategy as "balanced" | "aggressive" | "conservative", assetIdx);
      return;
    }

    setPhase("building"); setError(null);

    try {
      const res = await fetch("/api/vault/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerWallet: publicKey.toBase58(), strategy }),
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error ?? "Build failed");

      // If simulated on server (no VAULT_AUTHORITY_SECRET), fall back to local
      if (data.simulated || !data.serialisedTx) {
        createVault(strategy as "balanced" | "aggressive" | "conservative", assetIdx);
        setPhase("confirmed");
        setLastTx({ signature: data.mintTxSignature, explorerUrl: data.mintExplorerUrl, simulated: true });
        return;
      }

      setPhase("simulating");
      await sleep(300);

      setPhase("awaiting_signature");
      const tx       = Transaction.from(Buffer.from(data.serialisedTx, "base64"));
      const signedTx = await signTransaction(tx);

      setPhase("sending");
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
      await connection.confirmTransaction(sig, "confirmed");

      // Update local vault engine state
      createVault(strategy as "balanced" | "aggressive" | "conservative", assetIdx);

      setPhase("confirmed");
      setLastTx({ signature: sig, explorerUrl: `https://solscan.io/tx/${sig}`, simulated: false });

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase("error");
    }
  }, [liveMode, connected, publicKey, signTransaction, connection]);

  // ── Trigger risk event + Sophia response on-chain ─────────────────────────
  const triggerEventOnChain = useCallback(async (
    vaultId: string, pda: string, riskScore: number, strategy: string,
  ) => {
    if (!liveMode || !connected || !publicKey || !signTransaction) {
      // Simulation mode — use existing vaultEngine loop
      await triggerRiskEvent(vaultId);
      return;
    }

    setPhase("building"); setError(null);

    try {
      const RISK_DELTAS = [28, 22, 18, 24, 16, 30];
      const delta = RISK_DELTAS[Math.floor(Date.now() / 10000) % RISK_DELTAS.length];

      const res = await fetch("/api/vault/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerWallet: publicKey.toBase58(), pda, riskScorePrev: riskScore, riskEventDelta: delta, strategy, agentAction: "Sophia hedge response" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Update failed");

      if (data.simulated || !data.serialisedTx) {
        await triggerRiskEvent(vaultId);
        setPhase("confirmed");
        setLastTx({ signature: data.txSignature, explorerUrl: data.explorerUrl, simulated: true });
        return;
      }

      setPhase("simulating");
      await sleep(400);
      setPhase("awaiting_signature");
      const tx       = Transaction.from(Buffer.from(data.serialisedTx, "base64"));
      const signedTx = await signTransaction(tx);

      setPhase("sending");
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
      await connection.confirmTransaction(sig, "confirmed");

      // Sync local state
      await triggerRiskEvent(vaultId);
      setPhase("confirmed");
      setLastTx({ signature: sig, explorerUrl: `https://solscan.io/tx/${sig}`, simulated: false });

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase("error");
    }
  }, [liveMode, connected, publicKey, signTransaction, connection]);

  return { phase, error, lastTx, liveMode, setLiveMode, createVaultOnChain, triggerEventOnChain, reset };
}