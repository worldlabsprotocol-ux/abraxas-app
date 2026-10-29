// FILE: lib/developers/studioDefaultCallbackUrl.ts
// Safe default callback for Integration Studio create — valid for allowlist + hostname rules.

import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";

const LOCAL_DEV_CALLBACK = "http://localhost:3000/callback";

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

/** HTTPS same-site callback for hosted exploration; localhost for local dev. */
export function resolveStudioDefaultCallbackUrl(origin?: string | null): string {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : "";
  if (normalizedOrigin.startsWith("https://")) {
    const hosted = `${normalizedOrigin}/partner/callback`;
    if (validateLaunchpadReturnUrl(hosted).ok) return hosted;
  }
  return LOCAL_DEV_CALLBACK;
}

export function isStudioLocalDevCallback(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith("http://localhost") || trimmed.startsWith("http://127.0.0.1");
}
