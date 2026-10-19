"use client";
// FILE: components/nav/SolanaAccountSignInDialog.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { type WalletName } from "@solana/wallet-adapter-base";
import { useSolanaWalletDiscovery, PREFERRED_SOLANA_WALLETS } from "@/lib/wallet/useSolanaWalletDiscovery";
import { WALLET_INSTALL_URLS } from "@/lib/wallet/solanaWalletDiscovery";
import { walletOfferMeta } from "@/lib/wallet/solanaWalletDiscovery";
import {
  waitForSolanaWalletAdapter,
  WalletDiscoveryTimeoutError,
} from "@/lib/wallet/waitForSolanaWalletAdapter";
import {
  connectSelectedSolanaWallet,
  WalletConnectSequenceError,
} from "@/lib/wallet/connectSelectedSolanaWallet";
import {
  WALLET_CONNECT_USER_TIMEOUT_MS,
  logWalletConnectFailure,
} from "@/lib/nav/solanaSignInDialogState";
import type { PreferredSolanaWalletId } from "@/lib/wallet/solanaWalletDiscovery";
import { completeSolanaAccountSignIn } from "@/lib/auth/nativeAccount/clientSolanaAccountSignIn";
import { completeEphemeralWalletSignIn } from "@/lib/auth/ephemeralWallet/clientSignIn";
import {
  SOLANA_SIGN_IN_STEPS,
  activeSignInStepIndex,
  mapSignInFailure,
  mapWalletConnectFailure,
  signInModalTitle,
  signInStatusMessage,
  type SolanaSignInPhase,
} from "@/lib/nav/solanaSignInDialogState";
import styles from "./SolanaAccountSignInDialog.module.css";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
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
  const { offers } = useSolanaWalletDiscovery(open);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const connectRef = useRef(connect);
  connectRef.current = connect;
  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;
  const connectedRef = useRef(connected);
  connectedRef.current = connected;

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
    const focusTarget =
      primaryRef.current
      ?? panelRef.current?.querySelector<HTMLElement>('button[aria-label^="Connect"]');
    focusTarget?.focus();
  }, [open, resetDialog, walletConnected]);

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

  const connectWallet = useCallback(
    async (walletName: PreferredSolanaWalletId) => {
      setLocalError(null);
      setError(null);
      setSelectedWalletName(walletName);
      setPhase("connecting");
      setBusy(true);
      try {
        try {
          await waitForSolanaWalletAdapter({
            walletId: walletName,
            getReadyState: () =>
              walletsRef.current.find((w) => w.adapter.name === walletName)?.readyState,
          });
        } catch (error) {
          if (error instanceof WalletDiscoveryTimeoutError) {
            throw error;
          }
          const offer = offers[walletName];
          if (offer?.status !== "available") {
            throw new Error("wallet_not_detected");
          }
        }
        await Promise.race([
          connectSelectedSolanaWallet({
            walletId: walletName,
            wallets: walletsRef.current,
            select,
            connect: () => connectRef.current(),
            getSelectedWallet: () => walletRef.current,
            getPublicKey: () => publicKeyRef.current,
            isContextConnected: () => connectedRef.current,
            commitSelection: (name) => {
              flushSync(() => {
                select(name);
              });
            },
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("wallet_connect_timeout")), WALLET_CONNECT_USER_TIMEOUT_MS);
          }),
        ]);
        setPhase("connected");
      } catch (error) {
        if (error instanceof Error && error.message === "wallet_not_detected") {
          setPhase("failure");
          const msg = `${walletName} was not detected. Install the extension or choose another wallet.`;
          setLocalError(msg);
          setError(msg);
          return;
        }
        setPhase("failure");
        const diagnostic =
          error instanceof WalletConnectSequenceError ? error.diagnostic : undefined;
        logWalletConnectFailure(error, {
          walletId: walletName,
          stage: diagnostic?.stage,
          adapterReadyState: diagnostic?.adapterReadyState ?? null,
          selectionCommitted: diagnostic?.selectionCommitted,
          connectInvoked: diagnostic?.connectInvoked,
        });
        const msg = mapWalletConnectFailure(error, walletName, {
          walletId: walletName,
          stage: diagnostic?.stage,
          adapterReadyState: diagnostic?.adapterReadyState ?? null,
          selectionCommitted: diagnostic?.selectionCommitted,
          connectInvoked: diagnostic?.connectInvoked,
        });
        setLocalError(msg);
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [connect, select, setBusy, setError, wallets, offers],
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
      aria-describedby="sol-account-signin-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className={styles.panel} ref={panelRef}>
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
          id="sol-account-signin-desc"
          style={{
            margin: "0 0 0.65rem",
            fontFamily: FONT,
            fontSize: "0.86rem",
            lineHeight: 1.55,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          Your wallet proves you control this address. Abraxas asks for a message signature, not a
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
          No funds move. No spending access is granted. Connect your wallet, then review and sign the
          message.
        </p>

        {statusMessage ? (
          <div
            className={`${styles.statusRow} ${pending ? styles.statusRowPending : ""}`}
            role="status"
            aria-live="polite"
          >
            {pending ? <span className={styles.spinner} aria-hidden /> : null}
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className={styles.successBox} role="status">
            Wallet confirmed. Entering Abraxas…
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
            {PREFERRED_SOLANA_WALLETS.map((walletId) => {
              const isSelected = selectedWalletName === walletId;
              const offer = offers[walletId];
              const meta = walletOfferMeta(offer?.status ?? "discovering");
              const installUrl = WALLET_INSTALL_URLS[walletId] ?? "#";

              if (meta.showInstall) {
                return (
                  <div
                    key={walletId}
                    className={styles.walletCard}
                    style={{ cursor: "default" }}
                    role="group"
                    aria-label={`${walletId} not installed`}
                  >
                    <strong style={{ fontSize: "0.88rem" }}>{walletId}</strong>
                    <span className={styles.walletMeta}>{meta.detail}</span>
                    <a
                      className={styles.linkBtn}
                      href={installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install {walletId}
                    </a>
                  </div>
                );
              }

              const connectLabel =
                connecting && isSelected
                  ? "Opening wallet…"
                  : offer?.status === "discovering"
                    ? meta.actionLabel
                    : `Connect ${walletId}`;

              return (
                <button
                  key={walletId}
                  type="button"
                  className={`${styles.walletCard} ${isSelected ? styles.walletCardSelected : ""}`}
                  disabled={pending || connecting || offer?.status === "discovering"}
                  aria-pressed={isSelected}
                  aria-label={`Connect ${walletId}`}
                  onClick={() => void connectWallet(walletId)}
                >
                  <strong style={{ fontSize: "0.88rem" }}>{walletId}</strong>
                  <span className={styles.walletMeta}>{meta.detail}</span>
                  <span className={styles.walletMeta}>{connectLabel}</span>
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
            Wallet connected. Click <strong>Sign message</strong> to finish sign in.
          </p>
        ) : null}
      </div>
    </div>
  );
}
