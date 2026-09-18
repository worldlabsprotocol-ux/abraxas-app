// FILE: lib/partner/launchpad/productionCallbackReadiness.ts
// Production promotion requires a real HTTPS callback; localhost remains sandbox-only.

import { normalizePartnerReturnUrlForAllowlist } from "@/lib/connect/returnUrlAllowlistSemantics";

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized === "127.0.0.1"
    || normalized === "[::1]";
}

export function isProductionLaunchpadCallback(returnUrl: string): boolean {
  const normalized = normalizePartnerReturnUrlForAllowlist(returnUrl);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" && !isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function hasProductionLaunchpadCallback(allowedUrls: string[]): boolean {
  return allowedUrls.some(isProductionLaunchpadCallback);
}
