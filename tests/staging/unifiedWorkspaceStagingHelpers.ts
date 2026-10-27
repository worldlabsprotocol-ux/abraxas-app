// FILE: tests/staging/unifiedWorkspaceStagingHelpers.ts

import type { APIRequestContext } from "@playwright/test";

export async function fetchWalletOperational(
  request: APIRequestContext,
  base: string,
): Promise<{ operational: boolean; enabled: boolean; body: Record<string, unknown> }> {
  const res = await request.get(`${base}/api/auth/wallet/enabled`, { failOnStatusCode: false });
  const body = (await res.json()) as Record<string, unknown>;
  return {
    operational: body.operational === true,
    enabled: body.enabled === true,
    body,
  };
}

export async function fetchDeploymentIdentity(
  request: APIRequestContext,
  base: string,
): Promise<{ commit_sha: string | null; ok: boolean }> {
  const res = await request.get(`${base}/api/launchpad/staging/environment`, { failOnStatusCode: false });
  if (!res.ok()) return { commit_sha: null, ok: false };
  const body = (await res.json()) as { commit_sha?: string };
  return { commit_sha: body.commit_sha ?? null, ok: true };
}

export const UNIFIED_HANDOFF_PATH =
  "/developers/ephemeral-sandbox?integration=1&source=developer-workspace&pack=wallet_control&path=verify_with_abraxas&step=create_sandbox#sandbox";

export const VIEWPORTS = [
  { name: "320", width: 320, height: 640 },
  { name: "375", width: 375, height: 812 },
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
] as const;
