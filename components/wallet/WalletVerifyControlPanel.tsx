"use client";
// FILE: components/wallet/WalletVerifyControlPanel.tsx
// Unified wallet selector + interruption-safe partner wallet-control verification.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { describeWalletVerifyRecoveryCode } from "@/lib/auth/holderAuthErrorCopy";
import { connectSelectedSolanaWallet } from "@/lib/wallet/connectSelectedSolanaWallet";
import { detectMetaMaskInjectable, METAMASK_INSTALL_URL } from "@/lib/wallet/detectEvmProvider";
import { runPassportEvmWalletAuth } from "@/lib/wallet/passportEvmAuthClient";
import { runPassportSolanaWalletAuth } from "@/lib/wallet/passportSolanaAuthClient";
import {
  detectPhantomInjectable,
  WALLET_INSTALL_URLS,
  type PreferredSolanaWalletId,
} from "@/lib/wallet/solanaWalletDiscovery";
import { createWalletVerifyAttempt } from "@/lib/wallet/walletVerifyAttempt";
import type { WalletVerifyChoice, WalletVerifyPhase } from "@/lib/wallet/walletVerifyFlowTypes";
import { walletVerifyPhaseDetail, walletVerifyPhaseHeadline } from "@/lib/wallet/walletVerifyPhaseCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

function walletChoiceLabel(choice: WalletVerifyChoice | null): string | null {
  if (choice === "phantom") return "Phantom";
  if (choice === "metamask") return "MetaMask";
  return null;
}

export function WalletVerifyControlPanel({
  onSuccess,
  compact = false,
}: {
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const {
    wallets,
    select,
    connect,
    connected,
    connecting,
    publicKey,
    signMessage,
    wallet,
    disconnect,
  } = useWallet();

  const [phase, setPhase] = useState<WalletVerifyPhase>("choose_wallet");
  const [choice, setChoice] = useState<WalletVerifyChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoverySettled, setDiscoverySettled] = useState(false);
  const attemptRef = useRef<ReturnType<typeof createWalletVerifyAttempt> | null>(null);
  const publicKeyRef = useRef(publicKey);
  const signMessageRef = useRef(signMessage);
  const walletRef = useRef(wallet);
  const connectedRef = useRef(connected);

  useEffect(() => {
    publicKeyRef.current = publicKey;
    signMessageRef.current = signMessage;
    walletRef.current = wallet;
    connectedRef.current = connected;
  }, [publicKey, signMessage, wallet, connected]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDiscoverySettled(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const phantomListed = useMemo(
    () => wallets.find((w) => w.adapter.name === "Phantom") ?? null,
    [wallets],
  );
  const phantomInjectable = detectPhantomInjectable();
  const phantomAvailable = Boolean(
    phantomInjectable
    || phantomListed?.readyState === WalletReadyState.Installed
    || phantomListed?.readyState === WalletReadyState.Loadable,
  );

  /** MetaMask card only when MetaMask is detected — no generic EVM fallback for Solana wallet control. */
  const metamaskAvailable = detectMetaMaskInjectable();

  const cancelAttempt = useCallback(() => {
    attemptRef.current?.invalidate();
    attemptRef.current = null;
    setPhase("choose_wallet");
    setError(null);
  }, []);

  const runSolanaVerify = useCallback(async (existingAttempt?: ReturnType<typeof createWalletVerifyAttempt>) => {
    const pk = publicKeyRef.current;
    const sm = signMessageRef.current;
    if (!pk || !sm) {
      setError("Connect Phantom before signing.");
      setPhase("error");
      return;
    }
    const attempt = existingAttempt ?? createWalletVerifyAttempt();
    attemptRef.current = attempt;
    setPhase("awaiting_signature");
    setError(null);

    const auth = await runPassportSolanaWalletAuth({
      walletAddress: pk.toBase58(),
      signMessage: sm,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt,
      onPhase: (next) => setPhase(next === "verify" ? "verifying" : "awaiting_signature"),
    });
    if (attempt.isStale()) return;

    if (!auth.ok) {
      if (auth.code === "stale" || auth.code === "aborted") {
        setPhase("choose_wallet");
        return;
      }
      setError(describeWalletVerifyRecoveryCode(auth.code, auth.phase));
      setPhase("error");
      return;
    }

    setPhase("verified");
    attemptRef.current = null;
    onSuccess?.();
  }, [onSuccess]);

  const startPhantom = useCallback(async () => {
    setChoice("phantom");
    setError(null);
    const attempt = createWalletVerifyAttempt();
    attemptRef.current = attempt;

    if (connectedRef.current && walletRef.current?.adapter.name === "Phantom" && publicKeyRef.current) {
      await runSolanaVerify(attempt);
      return;
    }

    setPhase("connecting");
    try {
      await connectSelectedSolanaWallet({
        walletId: "Phantom" as PreferredSolanaWalletId,
        wallets,
        select,
        connect,
        getSelectedWallet: () => walletRef.current ?? null,
        getPublicKey: () => publicKeyRef.current,
        isContextConnected: () => connectedRef.current,
        commitSelection: select,
      });
      if (attempt.isStale()) return;
      await runSolanaVerify(attempt);
    } catch (connectError) {
      if (attempt.isStale()) return;
      const message = connectError instanceof Error ? connectError.message : "wallet_connect_failed";
      setError(describeWalletVerifyRecoveryCode(message, "connect"));
      setPhase("error");
    }
  }, [wallets, select, connect, runSolanaVerify]);

  const startMetaMask = useCallback(async () => {
    setChoice("metamask");
    setError(null);
    const attempt = createWalletVerifyAttempt();
    attemptRef.current = attempt;
    setPhase("connecting");

    const connectedAuth = await runPassportEvmWalletAuth({
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt,
      onPhase: (next) => {
        if (next === "connect") setPhase("connecting");
        else if (next === "sign") setPhase("awaiting_signature");
        else setPhase("verifying");
      },
    });
    if (attempt.isStale()) return;

    if (!connectedAuth.ok) {
      if (connectedAuth.code === "stale" || connectedAuth.code === "aborted") {
        setPhase("choose_wallet");
        return;
      }
      if (connectedAuth.phase === "connect") {
        setPhase("connecting");
      } else if (connectedAuth.phase === "sign") {
        setPhase("awaiting_signature");
      } else {
        setPhase("verifying");
      }
      setError(describeWalletVerifyRecoveryCode(connectedAuth.code, connectedAuth.phase));
      setPhase("error");
      return;
    }

    setPhase("verified");
    attemptRef.current = null;
    onSuccess?.();
  }, [onSuccess]);

  const walletLabel = walletChoiceLabel(choice);
  const pending = phase === "connecting" || phase === "awaiting_signature" || phase === "verifying";
  const showCancel = pending;

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: compact ? "0.85rem 0.95rem" : "1rem 1.1rem",
        background: "var(--surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span aria-hidden style={{ color: "#14F195" }}>✓</span>
          {walletVerifyPhaseHeadline(phase, walletLabel)}
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {walletVerifyPhaseDetail(phase, walletLabel)}
        </p>
      </div>

      {phase === "choose_wallet" || phase === "error" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.65rem",
          }}
        >
          <button
            type="button"
            disabled={!phantomAvailable && discoverySettled}
            onClick={() => void startPhantom()}
            style={walletCardStyle("phantom", !phantomAvailable && discoverySettled)}
          >
            <span style={{ fontSize: "1.35rem" }} aria-hidden>👻</span>
            <span style={{ fontWeight: 700 }}>Phantom</span>
            {!phantomAvailable && discoverySettled ? (
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Install extension</span>
            ) : null}
          </button>

          <button
            type="button"
            disabled={!metamaskAvailable}
            onClick={() => void startMetaMask()}
            style={walletCardStyle("metamask", !metamaskAvailable)}
          >
            <span style={{ fontSize: "1.35rem" }} aria-hidden>🦊</span>
            <span style={{ fontWeight: 700 }}>MetaMask</span>
            {!metamaskAvailable ? (
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Install extension</span>
            ) : null}
          </button>
        </div>
      ) : null}

      {phase === "choose_wallet" && !phantomAvailable && discoverySettled ? (
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          <a href={WALLET_INSTALL_URLS.Phantom} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            Install Phantom
          </a>
          {" "}to verify with Solana, or choose MetaMask for EVM wallet control.
        </p>
      ) : null}

      {phase === "choose_wallet" && !metamaskAvailable ? (
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          <a href={METAMASK_INSTALL_URL} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            Install MetaMask
          </a>
          {" "}for EVM wallet control.
        </p>
      ) : null}

      {pending ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p role="status" style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {phase === "connecting" && connecting ? "Waiting for wallet connection…" : null}
            {phase === "awaiting_signature" ? "Waiting for wallet signature…" : null}
            {phase === "verifying" ? "Confirming with Abraxas…" : null}
          </p>
          {showCancel ? (
            <button
              type="button"
              onClick={() => {
                cancelAttempt();
                if (choice === "phantom" && connected) {
                  void disconnect().catch(() => undefined);
                }
              }}
              style={{
                alignSelf: "flex-start",
                padding: "0.45rem 0.75rem",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel Abraxas attempt
            </button>
          ) : null}
          {showCancel ? (
            <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              This stops Abraxas&apos;s pending step and starts fresh on retry. If a wallet extension popup is still open, dismiss it in the extension before signing again.
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "error" && error ? (
        <p role="alert" style={{ margin: 0, color: "#E0524F", fontSize: "0.84rem", lineHeight: 1.55 }}>
          {error}
        </p>
      ) : null}

      {phase === "error" ? (
        <button
          type="button"
          onClick={() => {
            setPhase("choose_wallet");
            setError(null);
            if (choice === "phantom") void startPhantom();
            else if (choice === "metamask") void startMetaMask();
          }}
          style={{
            padding: "0.55rem 0.85rem",
            borderRadius: 10,
            border: "none",
            background: "#14F195",
            color: "#04110c",
            fontFamily: FONT,
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Try signing again
        </button>
      ) : null}

      <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
        <li>No transaction or spending approval requested</li>
        <li>Only the approved verification result is shared with the partner</li>
      </ul>
    </div>
  );
}

function walletCardStyle(kind: WalletVerifyChoice, disabled: boolean): CSSProperties {
  const accent = kind === "phantom" ? "#AB9FF2" : "#E2761B";
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.85rem 0.65rem",
    borderRadius: 12,
    border: `1px solid ${disabled ? "var(--border-subtle)" : accent}`,
    background: disabled ? "transparent" : "rgba(255,255,255,0.03)",
    color: "var(--text-primary)",
    fontFamily: FONT,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}
