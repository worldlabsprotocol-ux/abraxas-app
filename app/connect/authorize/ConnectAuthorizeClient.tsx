"use client";
// FILE: app/connect/authorize/ConnectAuthorizeClient.tsx

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EvmWalletConnectActions } from "@/components/wallet/EvmWalletConnectActions";
import {
  ensureBrowserSession,
  probeBrowserSession,
} from "@/lib/auth/ensureBrowserSessionClient";
import {
  CONNECT_SIGN_IN_PROMPT,
  mapBrowserSessionSetupFailure,
} from "@/lib/auth/sessionErrors";
import { loadUserSession } from "@/lib/sui/zklogin/session";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { useBindEvmWallet } from "@/lib/walletAuthority/client/useBindEvmWallet";
import { ensurePassportBrowserSessionForBind } from "@/lib/walletAuthority/client/bindEvmWallet";
import { mapWalletApiError } from "@/lib/walletAuthority/client/sessionHints";
import { WhatGetsSharedCard } from "@/components/consent/WhatGetsSharedCard";
import { passportWalletAddHref } from "@/lib/passport/passportWalletDeepLink";

interface ConnectPreview {
  authorization: {
    authorization_request_id: string;
    partner_id: string;
    policy_id: string;
    requested_action: string | null;
    status: string;
    expires_at: string;
    wallet_address: string | null;
    chain: string;
  };
  policy_name: string;
  never_shared: string[];
}

type SessionSyncState = "loading" | "ready" | "needs_sign_in" | "error";

export default function ConnectAuthorizeClient({ requestId }: { requestId: string }) {
  const [preview, setPreview] = useState<ConnectPreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [sessionSync, setSessionSync] = useState<SessionSyncState>("loading");
  const [sessionSyncError, setSessionSyncError] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);

  const connectReturnPath = `/connect/authorize?request=${requestId}`;
  const { signInWithGoogle, isConfigured, error: authError } = useSuiAuth();

  const expectedWallet = preview?.authorization.wallet_address ?? null;
  const {
    bindInjected,
    bindWalletConnect,
    loading: bindLoading,
    error: bindError,
    result: bindResult,
    bound,
    uiState,
  } = useBindEvmWallet({ expectedWalletAddress: expectedWallet, credentials: "include" });

  const syncPassportSession = useCallback(async () => {
    setSessionSync("loading");
    setSessionSyncError("");
    const probe = await probeBrowserSession();
    if (probe.authenticated) {
      setSessionSync("ready");
      return;
    }
    const zk = loadUserSession();
    if (!zk?.suiAddress) {
      setSessionSync("needs_sign_in");
      return;
    }
    const ensured = await ensureBrowserSession(zk.suiAddress);
    if (!ensured.ok) {
      setSessionSync("error");
      setSessionSyncError(mapBrowserSessionSetupFailure(ensured.reason, ensured.status));
      return;
    }
    const after = await probeBrowserSession();
    setSessionSync(after.authenticated ? "ready" : "error");
    if (!after.authenticated) {
      setSessionSyncError(
        "Passport sign-in could not be confirmed in this browser. Sign in again on this page, then retry.",
      );
    }
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/connect/authorize/${requestId}`);
    const data = await res.json() as ConnectPreview & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load");
    setPreview(data);
  }, [requestId]);

  useEffect(() => {
    void load().catch(e => setLoadError(e instanceof Error ? e.message : "Load failed"));
    void syncPassportSession();
  }, [load, syncPassportSession]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        void syncPassportSession();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [syncPassportSession]);

  async function handleConnectSignIn() {
    setSignInBusy(true);
    try {
      await signInWithGoogle({ returnPath: connectReturnPath });
    } finally {
      setSignInBusy(false);
    }
  }

  async function consent() {
    setConsentLoading(true);
    setConsentError("");
    try {
      await ensurePassportBrowserSessionForBind();
      const res = await fetch(`/api/connect/authorize/${requestId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { redirect_url?: string; error?: string };
      if (!res.ok) {
        throw new Error(mapWalletApiError(data.error ?? "Consent failed", res.status));
      }
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e) {
      setConsentError(e instanceof Error ? e.message : "Consent failed");
    } finally {
      setConsentLoading(false);
    }
  }

  if (!preview) {
    return (
      <div style={{ padding: "2rem", color: "#ccc", fontFamily: "monospace" }}>
        {loadError || "Loading authorization request…"}
      </div>
    );
  }

  const needsEvmBind = preview.authorization.chain === "evm" && preview.authorization.wallet_address;
  const sessionReady = sessionSync === "ready";
  const sessionLoading = sessionSync === "loading";
  const loading = bindLoading || consentLoading || sessionLoading || signInBusy;
  const showBindError = bindError && !sessionLoading;
  const showConsentError = consentError && !sessionLoading;
  const showSessionError = sessionSyncError && sessionSync === "error";
  const error = showBindError ?? showConsentError ?? (showSessionError ? sessionSyncError : "");
  const passportHref = `/passport?return=${encodeURIComponent(connectReturnPath)}`;

  return (
    <div style={{ maxWidth: 520, margin: "2rem auto", padding: "1.5rem", fontFamily: "system-ui,sans-serif", color: "#f0f0f0", background: "#0d1017", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: "0.7rem", color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 }}>ABRAXAS CONNECT</div>
      <h1 style={{ fontSize: "1.1rem", margin: "0 0 1rem" }}>Authorization request</h1>

      {sessionLoading && (
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          Confirming your Passport session…
        </p>
      )}

      {sessionSync === "needs_sign_in" && !sessionLoading && (
        <div style={{ marginBottom: "1rem", padding: "0.85rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8 }}>
          <p style={{ fontSize: "0.82rem", color: "#FBBF24", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
            {CONNECT_SIGN_IN_PROMPT}
          </p>
          <button
            type="button"
            onClick={() => void handleConnectSignIn()}
            disabled={signInBusy || !isConfigured}
            style={{
              width: "100%",
              padding: "0.7rem",
              cursor: isConfigured && !signInBusy ? "pointer" : "not-allowed",
              background: isConfigured ? "#14F195" : "rgba(255,255,255,0.15)",
              color: "#000",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            {signInBusy ? "Redirecting to Google…" : "Continue with Google"}
          </button>
          {(authError || !isConfigured) && (
            <p style={{ fontSize: "0.72rem", color: "#f26b6b", marginTop: "0.5rem", marginBottom: 0 }}>
              {authError ?? "Google sign-in is not configured on this deployment."}
            </p>
          )}
        </div>
      )}

      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "1rem" }}>
        Review what <strong>{preview.authorization.partner_id}</strong> will receive before you approve.
      </p>

      <WhatGetsSharedCard
        partnerName={preview.authorization.partner_id}
        policyName={preview.policy_name}
        sharedLabels={[preview.policy_name]}
        requestedAction={preview.authorization.requested_action}
        willNotShareItems={preview.never_shared}
        compact
      />

      {preview.authorization.requested_action && (
        <p style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>Action: {preview.authorization.requested_action.replace(/_/g, " ")}</p>
      )}

      {preview.authorization.wallet_address && (
        <p style={{ fontSize: "0.75rem", wordBreak: "break-all", color: "rgba(255,255,255,0.5)", marginBottom: "0.75rem" }}>
          Wallet for this request: {preview.authorization.wallet_address.slice(0, 10)}…
        </p>
      )}

      {needsEvmBind && !bound && sessionReady && (
        <>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            To continue, add a wallet to your Passport. One signature proves control — no funds move.
          </p>
          <EvmWalletConnectActions
            uiState={uiState}
            loading={bindLoading}
            injectedLabel="Connect MetaMask"
            walletConnectLabel="Connect via WalletConnect"
            onInjected={() => void bindInjected().catch(() => undefined)}
            onWalletConnect={() => void bindWalletConnect().catch(() => undefined)}
          />
          <Link href={passportWalletAddHref(connectReturnPath)} style={{ display: "block", fontSize: "0.72rem", color: "#a78bfa", marginTop: "0.65rem" }}>
            Manage wallets in Passport →
          </Link>
        </>
      )}

      {bound && bindResult && (
        <p style={{ fontSize: "0.75rem", color: "#14F195", marginBottom: "0.5rem" }}>
          Wallet bound: {bindResult.address.slice(0, 10)}…
          {bindResult.connection_method === "walletconnect" ? " (WalletConnect)" : ""}
        </p>
      )}

      <button
        type="button"
        onClick={() => void consent()}
        disabled={loading || (needsEvmBind && !bound) || preview.authorization.status === "expired" || !sessionReady}
        style={{ width: "100%", padding: "0.75rem", cursor: "pointer", background: "#14F195", color: "#000", border: "none", borderRadius: 6, fontWeight: 600 }}
      >
        {consentLoading ? "Processing…" : "Approve and continue →"}
      </button>

      {error && <p style={{ color: "#f26b6b", fontSize: "0.8rem", marginTop: "0.75rem" }}>{error}</p>}

      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: "1rem" }}>
        Expires {new Date(preview.authorization.expires_at).toLocaleString()}.
      </p>

      {sessionSync !== "needs_sign_in" && (
        <Link href={passportHref} style={{ fontSize: "0.75rem", color: "#a78bfa" }}>
          Open Passport in this browser →
        </Link>
      )}
    </div>
  );
}
