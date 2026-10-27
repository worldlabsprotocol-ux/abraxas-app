"use client";
// FILE: lib/home/useHomeWorkspaceSession.ts

import { useCallback, useEffect, useState } from "react";

export type WorkspaceOverview = {
  native_account: {
    authenticated: boolean;
    account_id: string | null;
    partner_membership_count: number;
  };
  wallet_auth?: {
    authenticated: boolean;
    wallet_address: string | null;
    auth_mode: "ephemeral_wallet" | null;
  };
  partner_console: { authenticated: boolean; partner_id: string | null; environment: string | null };
};

export type NativeAuthMode = "ephemeral_wallet" | "native" | null;

export type WorkspaceSessionMode =
  | "loading"
  | "native_disabled"
  | "native_unavailable"
  | "needs_account"
  | "ephemeral_sandbox_ready"
  | "needs_workspace"
  | "has_workspace";

export function hasPersistentAccountSession(overview: WorkspaceOverview): boolean {
  return Boolean(overview.native_account.account_id);
}

export function resolveWorkspaceSessionMode(input: {
  nativeFlagEnabled: boolean | null;
  nativeOperational: boolean | null;
  authMode: NativeAuthMode;
  overview: WorkspaceOverview | null;
}): WorkspaceSessionMode {
  const { nativeFlagEnabled, nativeOperational, authMode, overview } = input;
  if (nativeFlagEnabled === null || nativeOperational === null || !overview) return "loading";
  if (!nativeFlagEnabled) return "native_disabled";
  if (!nativeOperational) return "native_unavailable";

  const accountReady = hasPersistentAccountSession(overview);
  const walletSignedIn = Boolean(overview.wallet_auth?.authenticated);

  if (!accountReady) {
    if (authMode === "ephemeral_wallet" && walletSignedIn) {
      return "ephemeral_sandbox_ready";
    }
    return "needs_account";
  }

  const hasWorkspace =
    overview.partner_console.authenticated ||
    Boolean(overview.partner_console.partner_id && overview.partner_console.environment === "sandbox") ||
    overview.native_account.partner_membership_count > 0;
  return hasWorkspace ? "has_workspace" : "needs_workspace";
}

export function useHomeWorkspaceSession() {
  const [nativeFlagEnabled, setNativeFlagEnabled] = useState<boolean | null>(null);
  const [nativeOperational, setNativeOperational] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<NativeAuthMode>(null);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);

  const refresh = useCallback(async () => {
    const [enabledRes, overviewRes] = await Promise.all([
      fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
      fetch("/api/account/overview", { credentials: "include" }),
    ]);
    const enabledJson = (await enabledRes.json()) as {
      enabled?: boolean;
      operational?: boolean;
      auth_mode?: string;
    };
    const flagEnabled = Boolean(enabledJson.enabled);
    const operational =
      typeof enabledJson.operational === "boolean" ? enabledJson.operational : flagEnabled;
    setNativeFlagEnabled(flagEnabled);
    setNativeOperational(operational);
    setAuthMode(enabledJson.auth_mode === "ephemeral_wallet" ? "ephemeral_wallet" : "native");
    if (overviewRes.ok) {
      setOverview((await overviewRes.json()) as WorkspaceOverview);
    } else {
      setOverview({
        native_account: { authenticated: false, account_id: null, partner_membership_count: 0 },
        partner_console: { authenticated: false, partner_id: null, environment: null },
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSessionChange = () => void refresh();
    window.addEventListener("abraxas:native-account-session", onSessionChange);
    window.addEventListener("abraxas:wallet-session", onSessionChange);
    return () => {
      window.removeEventListener("abraxas:native-account-session", onSessionChange);
      window.removeEventListener("abraxas:wallet-session", onSessionChange);
    };
  }, [refresh]);

  const mode = resolveWorkspaceSessionMode({
    nativeFlagEnabled,
    nativeOperational,
    authMode,
    overview,
  });

  const walletOnlyWithoutAccount =
    Boolean(overview?.wallet_auth?.authenticated) && !hasPersistentAccountSession(overview!);

  /** True when passkey workspace enrollment may run (operational gate). */
  const nativeEnabled = nativeOperational;

  return {
    authMode,
    nativeEnabled,
    nativeFlagEnabled,
    nativeOperational,
    overview,
    mode,
    walletOnlyWithoutAccount,
    refresh,
  };
}
