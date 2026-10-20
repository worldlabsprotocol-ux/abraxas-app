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
const CONNECT_WALLET_DISCLAIMER =
  "You'll be asked to sign a message to verify wallet control. No transaction or spending permission is required.";

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function walletAdapterIcon(
  wallets: ReturnType<typeof useWallet>["wallets"],
  walletId: PreferredSolanaWalletId,
): string | undefined {
  const icon = wallets.find((w) => w.adapter.name === walletId)?.adapter.icon;
  return icon && icon.length > 0 ? icon : undefined;
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
  const signInAbortRef = useRef<AbortController | null>(null);
  const signAttemptGenerationRef = useRef(0);
  const signInFlightRef = useRef(false);

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

  const abortPendingSignIn = useCallback(() => {
    signInAbortRef.current?.abort();
    signInAbortRef.current = null;
  }, []);

  const invalidateSignAttempt = useCallback(() => {
    signAttemptGenerationRef.current += 1;
    abortPendingSignIn();
  }, [abortPendingSignIn]);

  useEffect(() => {
    if (!open) {
      abortPendingSignIn();
      signAttemptGenerationRef.current += 1;
      signInFlightRef.current = false;
      setBusy(false);
      resetDialog();
      return;
    }
    const focusTarget =
      primaryRef.current
      ?? panelRef.current?.querySelector<HTMLElement>('button[aria-label^="Connect with"]');
    focusTarget?.focus();
  }, [open, resetDialog, walletConnected, abortPendingSignIn, setBusy]);

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
    if (signInFlightRef.current) return;
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

    abortPendingSignIn();
    const controller = new AbortController();
    signInAbortRef.current = controller;
    const generation = signAttemptGenerationRef.current;
    signInFlightRef.current = true;

    setBusy(true);
    setLocalError(null);
    setError(null);
    setPhase("signing");

    try {
      const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
      const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
      const useEphemeral = enabledJson.auth_mode === "ephemeral_wallet";

      setPhase("signing");
      const result = useEphemeral
        ? await completeEphemeralWalletSignIn({
            walletAddress: publicKey.toBase58(),
            signMessage,
            signal: controller.signal,
            isStale: () => generation !== signAttemptGenerationRef.current,
          })
        : await completeSolanaAccountSignIn({
            walletAddress: publicKey.toBase58(),
            signMessage,
          });

      if (generation !== signAttemptGenerationRef.current) {
        return;
      }

      if (!result.ok) {
        if (result.reason === "cancelled") {
          if (controller.signal.aborted || generation !== signAttemptGenerationRef.current) {
            setPhase("connected");
            return;
          }
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
      if (signInAbortRef.current === controller) {
        signInAbortRef.current = null;
      }
      signInFlightRef.current = false;
      setBusy(false);
    }
  }, [publicKey, signMessage, setBusy, setError, onSuccess, onClose, abortPendingSignIn]);

  const handleDialogCancel = useCallback(() => {
    if (phase === "signing") {
      invalidateSignAttempt();
      setBusy(false);
      setLocalError(null);
      setError(null);
      setPhase("connected");
      return;
    }
    onClose();
  }, [invalidateSignAttempt, onClose, phase, setBusy, setError]);

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
  const pending = phase === "connecting" || phase === "verifying" || busy;
  const signInPending = phase === "signing";

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

        {!showWalletGrid ? (
          <p id="sol-account-signin-desc" className="sr-only">
            Review and sign the message in your wallet to finish sign in.
          </p>
        ) : null}

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
          <>
            <div className={styles.walletConnectStack} role="group" aria-label="Choose a Solana wallet">
              {(() => {
                const walletId: PreferredSolanaWalletId = "Phantom";
                const isSelected = selectedWalletName === walletId;
                const offer = offers[walletId];
                const meta = walletOfferMeta(offer?.status ?? "discovering");
                const installUrl = WALLET_INSTALL_URLS[walletId];
                const icon = walletAdapterIcon(wallets, walletId);
                const opening = connecting && isSelected;
                const detecting = offer?.status === "discovering";

                if (meta.showInstall) {
                  return (
                    <a
                      className={styles.walletHeroBtn}
                      href={installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {icon ? <img src={icon} alt="" className={styles.walletBtnIcon} aria-hidden /> : null}
                      Install Phantom
                    </a>
                  );
                }

                return (
                  <button
                    ref={primaryRef}
                    type="button"
                    className={styles.walletHeroBtn}
                    disabled={pending || connecting || detecting}
                    aria-label={`Connect with ${walletId}`}
                    onClick={() => void connectWallet(walletId)}
                  >
                    {icon ? <img src={icon} alt="" className={styles.walletBtnIcon} aria-hidden /> : null}
                    {opening ? "Opening…" : detecting ? "Detecting…" : walletId}
                  </button>
                );
              })()}

              {(() => {
                const walletId: PreferredSolanaWalletId = "Solflare";
                if (!PREFERRED_SOLANA_WALLETS.includes(walletId)) return null;
                const offer = offers[walletId];
                const meta = walletOfferMeta(offer?.status ?? "discovering");
                const installUrl = WALLET_INSTALL_URLS[walletId];
                const icon = walletAdapterIcon(wallets, walletId);
                const isSelected = selectedWalletName === walletId;
                const opening = connecting && isSelected;
                const detecting = offer?.status === "discovering";
                const adapterListed = wallets.some((w) => w.adapter.name === walletId);
                const supported =
                  meta.showInstall
                  || offer?.status === "available"
                  || offer?.status === "discovering"
                  || adapterListed;
                if (!supported) return null;

                if (meta.showInstall) {
                  return (
                    <a
                      className={styles.walletSecondaryLink}
                      href={installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install Solflare
                    </a>
                  );
                }

                return (
                  <button
                    type="button"
                    className={styles.walletSecondaryBtn}
                    disabled={pending || connecting || detecting}
                    aria-label={`Connect with ${walletId}`}
                    onClick={() => void connectWallet(walletId)}
                  >
                    {icon ? <img src={icon} alt="" className={styles.walletBtnIcon} aria-hidden /> : null}
                    {opening ? "Opening…" : detecting ? "Detecting…" : walletId}
                  </button>
                );
              })()}
            </div>
            <p id="sol-account-signin-desc" className={styles.connectDisclaimer}>
              {CONNECT_WALLET_DISCLAIMER}
            </p>
          </>
        ) : null}

        <div className={styles.actions}>
          {showSignPrimary ? (
            <button
              ref={primaryRef}
              type="button"
              className={styles.primaryBtn}
              disabled={pending || signInPending}
              onClick={() => void runSign()}
            >
              {signInPending || phase === "verifying" ? "Waiting for wallet approval" : "Sign message"}
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
            disabled={phase === "verifying"}
            onClick={handleDialogCancel}
          >
            {signInPending ? "Cancel" : "Cancel"}
          </button>
          {signInPending ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                invalidateSignAttempt();
                signInFlightRef.current = false;
                setBusy(false);
                setLocalError(null);
                setError(null);
                setPhase("connected");
                void runSign();
              }}
            >
              Try again
            </button>
          ) : null}
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
