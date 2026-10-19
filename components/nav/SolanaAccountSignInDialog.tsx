"use client";
// FILE: components/nav/SolanaAccountSignInDialog.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { completeSolanaAccountSignIn } from "@/lib/auth/nativeAccount/clientSolanaAccountSignIn";
import { completeEphemeralWalletSignIn } from "@/lib/auth/ephemeralWallet/clientSignIn";
import {
  SOLANA_SIGN_IN_STEPS,
  WALLET_INSTALL_URLS,
  activeSignInStepIndex,
  mapSignInFailure,
  mapWalletConnectFailure,
  signInModalTitle,
  signInStatusMessage,
  type SolanaSignInPhase,
} from "@/lib/nav/solanaSignInDialogState";
import styles from "./SolanaAccountSignInDialog.module.css";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const PREFERRED_WALLETS = ["Phantom", "Solflare"] as const;

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function SolanaAccountSignInDialog({
  open,
  onClose,
  onSuccess,
  busy,
  setBusy,
  setError,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const { publicKey, signMessage, connected, connecting, connect, select, wallet, wallets, disconnect } =
    useWallet();
  const primaryRef = useRef<HTMLButtonElement>(null);

  const [phase, setPhase] = useState<SolanaSignInPhase>("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null);

  const walletConnected = connected && Boolean(publicKey);
  const activeStep = activeSignInStepIndex({ phase, walletConnected });
  const title = signInModalTitle({ phase, walletConnected });
  const statusMessage = signInStatusMessage({
    phase,
    walletName: wallet?.adapter.name ?? selectedWalletName,
  });

  const resetDialog = useCallback(() => {
    setPhase("idle");
    setLocalError(null);
    setSelectedWalletName(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetDialog();
      return;
    }
    primaryRef.current?.focus();
  }, [open, resetDialog]);

  useEffect(() => {
    if (!open || busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) return;
    if (walletConnected && phase === "idle") {
      setPhase("connected");
    }
    if (!walletConnected && (phase === "connected" || phase === "success")) {
      setPhase("idle");
    }
  }, [open, walletConnected, phase]);

  const walletOptions = PREFERRED_WALLETS.map((label) => {
    const match = wallets.find((w) => w.adapter.name === label);
    const ready = match?.readyState ?? WalletReadyState.NotDetected;
    const installed =
      ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable;
    return {
      name: label,
      label,
      installed,
      installUrl: WALLET_INSTALL_URLS[label] ?? "#",
      adapter: match,
    };
  });

  const connectWallet = useCallback(
    async (walletName: string) => {
      setLocalError(null);
      setError(null);
      setSelectedWalletName(walletName);
      setPhase("connecting");
      setBusy(true);
      try {
        select(walletName as WalletName);
        await connect();
        setPhase("connected");
      } catch (error) {
        setPhase("failure");
        const msg = mapWalletConnectFailure(error);
        setLocalError(msg);
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [connect, select, setBusy, setError],
  );

  const runSign = useCallback(async () => {
    if (!publicKey) {
      const msg = "Connect a wallet first, then sign the message.";
      setLocalError(msg);
      setError(msg);
      setPhase("idle");
      return;
    }
    if (!signMessage) {
      const msg = "This wallet does not support message signing. Try Phantom or Solflare.";
      setLocalError(msg);
      setError(msg);
      setPhase("failure");
      return;
    }

    setBusy(true);
    setLocalError(null);
    setError(null);
    setPhase("signing");

    try {
      const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
      const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
      const useEphemeral = enabledJson.auth_mode === "ephemeral_wallet";

      setPhase("signing");
      const signPromise = useEphemeral
        ? completeEphemeralWalletSignIn({
            walletAddress: publicKey.toBase58(),
            signMessage,
          })
        : completeSolanaAccountSignIn({
            walletAddress: publicKey.toBase58(),
            signMessage,
          });

      const timeoutMs = 120_000;
      const result = await Promise.race([
        signPromise,
        new Promise<{ ok: false; reason: "failed"; message: string }>((resolve) => {
          setTimeout(
            () => resolve({ ok: false, reason: "failed", message: "Sign-in request timed out. Try again." }),
            timeoutMs,
          );
        }),
      ]);

      if (!result.ok) {
        if (result.reason === "cancelled") {
          const msg = mapSignInFailure({ reason: "cancelled" });
          setLocalError(msg);
          setError(msg);
          setPhase("connected");
          return;
        }
        const msg = mapSignInFailure({
          reason: "failed",
          code: "code" in result ? result.code : undefined,
          message: "message" in result ? result.message : undefined,
        });
        setLocalError(msg);
        setError(msg);
        setPhase("failure");
        return;
      }

      setPhase("verifying");
      await new Promise((r) => setTimeout(r, 350));
      setPhase("success");
      await new Promise((r) => setTimeout(r, 500));
      onSuccess();
      onClose();
    } finally {
      setBusy(false);
    }
  }, [publicKey, signMessage, setBusy, setError, onSuccess, onClose]);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    setError(null);
    setPhase(walletConnected ? "connected" : "idle");
  }, [setError, walletConnected]);

  const handleChooseAnother = useCallback(async () => {
    setLocalError(null);
    setError(null);
    try {
      await disconnect();
    } catch {
      /* ignore */
    }
    setPhase("idle");
    setSelectedWalletName(null);
  }, [disconnect, setError]);

  if (!open) return null;

  const showWalletGrid = !walletConnected && phase !== "success" && phase !== "verifying";
  const showSignPrimary =
    walletConnected
    && (phase === "connected" || phase === "failure" || phase === "signing" || phase === "verifying");
  const pending = phase === "connecting" || phase === "signing" || phase === "verifying" || busy;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sol-account-signin-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.hero}>
          <div className={styles.orbit} aria-hidden>
            <div className={styles.orbitCore} />
          </div>
        </div>

        <div className={styles.steps} aria-label="Sign-in progress">
          {SOLANA_SIGN_IN_STEPS.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <div
                key={step.id}
                className={`${styles.step} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}
              >
                <div className={styles.stepDot} />
                {step.label}
              </div>
            );
          })}
        </div>

        <h2
          id="sol-account-signin-title"
          style={{
            margin: "0 0 0.5rem",
            fontFamily: FONT,
            fontSize: "1.05rem",
            fontWeight: 650,
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: "0 0 0.65rem",
            fontFamily: FONT,
            fontSize: "0.86rem",
            lineHeight: 1.55,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          Your wallet proves you control this address. Abraxas will ask for a message signature — not a
          transaction.
        </p>
        <p
          style={{
            margin: "0 0 1rem",
            fontFamily: FONT,
            fontSize: "0.78rem",
            lineHeight: 1.5,
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          No funds moved · no token approval · no personal identity verification. Connect your wallet first,
          then review and sign a short message.
        </p>

        {statusMessage ? (
          <div className={`${styles.statusRow} ${pending ? styles.statusRowPending : ""}`} role="status">
            {pending ? <span className={styles.spinner} aria-hidden /> : null}
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className={styles.successBox} role="status">
            Wallet confirmed — entering Abraxas…
          </div>
        ) : null}

        {localError ? (
          <div className={styles.errorBox} role="alert">
            {localError}
          </div>
        ) : null}

        {walletConnected && publicKey ? (
          <p
            style={{
              margin: "0 0 1rem",
              fontFamily: FONT,
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Connected: {wallet?.adapter.name ?? "Wallet"} · {shortAddress(publicKey.toBase58())}
          </p>
        ) : null}

        {showWalletGrid ? (
          <div className={styles.walletGrid} role="group" aria-label="Choose a Solana wallet">
            {walletOptions.map((option) => {
              const isSelected = selectedWalletName === option.name;
              if (!option.installed) {
                return (
                  <div key={option.name} className={styles.walletCard} style={{ cursor: "default" }}>
                    <strong style={{ fontSize: "0.88rem" }}>{option.label}</strong>
                    <span className={styles.walletMeta}>Extension not detected</span>
                    <a
                      className={styles.linkBtn}
                      href={option.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install {option.label}
                    </a>
                  </div>
                );
              }
              return (
                <button
                  key={option.name}
                  type="button"
                  className={`${styles.walletCard} ${isSelected ? styles.walletCardSelected : ""}`}
                  disabled={pending || connecting}
                  onClick={() => void connectWallet(option.name)}
                >
                  <strong style={{ fontSize: "0.88rem" }}>{option.label}</strong>
                  <span className={styles.walletMeta}>
                    {connecting && isSelected ? "Connecting…" : "Connect"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={styles.actions}>
          {showSignPrimary ? (
            <button
              ref={primaryRef}
              type="button"
              className={styles.primaryBtn}
              disabled={pending}
              onClick={() => void runSign()}
            >
              {phase === "signing" || phase === "verifying" ? "Waiting for signature…" : "Sign message"}
            </button>
          ) : null}

          {phase === "failure" ? (
            <>
              <button type="button" className={styles.primaryBtn} disabled={pending} onClick={handleRetry}>
                Try again
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={pending}
                onClick={() => void handleChooseAnother()}
              >
                Choose another wallet
              </button>
            </>
          ) : null}

          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        {walletConnected && phase === "connected" && !localError ? (
          <p
            style={{
              margin: "0.75rem 0 0",
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Wallet connected — click <strong>Sign message</strong> to finish sign-in.
          </p>
        ) : null}
      </div>
    </div>
  );
}
