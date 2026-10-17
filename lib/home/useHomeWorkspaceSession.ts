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
  | "needs_account"
  | "needs_workspace"
  | "has_workspace";

export function resolveWorkspaceSessionMode(
  nativeEnabled: boolean | null,
  overview: WorkspaceOverview | null,
): WorkspaceSessionMode {
  if (nativeEnabled === null || !overview) return "loading";
  if (!nativeEnabled) return "native_disabled";
  if (!overview.native_account.authenticated) return "needs_account";
  const hasWorkspace =
    overview.partner_console.authenticated ||
    Boolean(overview.partner_console.partner_id && overview.partner_console.environment === "sandbox") ||
    overview.native_account.partner_membership_count > 0;
  return hasWorkspace ? "has_workspace" : "needs_workspace";
}

export function useHomeWorkspaceSession() {
  const [nativeEnabled, setNativeEnabled] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);

  const refresh = useCallback(async () => {
    const [enabledRes, overviewRes] = await Promise.all([
      fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
      fetch("/api/account/overview", { credentials: "include" }),
    ]);
    const enabledJson = (await enabledRes.json()) as { enabled?: boolean };
    setNativeEnabled(Boolean(enabledJson.enabled));
    if (overviewRes.ok) {
      setOverview((await overviewRes.json()) as WorkspaceOverview);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mode = resolveWorkspaceSessionMode(nativeEnabled, overview);

  return { nativeEnabled, overview, mode, refresh };
}
