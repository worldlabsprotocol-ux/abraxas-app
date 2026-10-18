"use client";
// FILE: lib/home/useHomeWorkspaceSession.ts

import { useCallback, useEffect, useState } from "react";

export type WorkspaceOverview = {
  native_account: { authenticated: boolean; account_id: string | null; partner_membership_count: number };
  partner_console: { authenticated: boolean; partner_id: string | null; environment: string | null };
};

export type WorkspaceSessionMode =
  | "loading"
  | "native_disabled"
  | "native_unavailable"
  | "needs_account"
  | "needs_workspace"
  | "has_workspace";

export function resolveWorkspaceSessionMode(input: {
  nativeFlagEnabled: boolean | null;
  nativeOperational: boolean | null;
  overview: WorkspaceOverview | null;
}): WorkspaceSessionMode {
  const { nativeFlagEnabled, nativeOperational, overview } = input;
  if (nativeFlagEnabled === null || nativeOperational === null || !overview) return "loading";
  if (!nativeFlagEnabled) return "native_disabled";
  if (!nativeOperational) return "native_unavailable";
  if (!overview.native_account.authenticated) return "needs_account";
  const hasWorkspace =
    overview.partner_console.authenticated ||
    Boolean(overview.partner_console.partner_id && overview.partner_console.environment === "sandbox") ||
    overview.native_account.partner_membership_count > 0;
  return hasWorkspace ? "has_workspace" : "needs_workspace";
}

export function useHomeWorkspaceSession() {
  const [nativeFlagEnabled, setNativeFlagEnabled] = useState<boolean | null>(null);
  const [nativeOperational, setNativeOperational] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);

  const refresh = useCallback(async () => {
    const [enabledRes, overviewRes] = await Promise.all([
      fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
      fetch("/api/account/overview", { credentials: "include" }),
    ]);
    const enabledJson = (await enabledRes.json()) as { enabled?: boolean; operational?: boolean };
    const flagEnabled = Boolean(enabledJson.enabled);
    const operational =
      typeof enabledJson.operational === "boolean" ? enabledJson.operational : flagEnabled;
    setNativeFlagEnabled(flagEnabled);
    setNativeOperational(operational);
    if (overviewRes.ok) {
      setOverview((await overviewRes.json()) as WorkspaceOverview);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mode = resolveWorkspaceSessionMode({
    nativeFlagEnabled,
    nativeOperational,
    overview,
  });

  /** True when passkey workspace enrollment may run (operational gate). */
  const nativeEnabled = nativeOperational;

  return { nativeEnabled, nativeFlagEnabled, nativeOperational, overview, mode, refresh };
}
