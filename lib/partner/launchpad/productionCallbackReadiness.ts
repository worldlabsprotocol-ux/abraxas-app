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

/** Launchpad callbacks are never allowed to target a wildcard or a non-public IP literal. */
export function isSafeLaunchpadCallbackHostname(hostname: string, allowLocalhost = false): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized || normalized.includes("*")) return false;
  if (isLocalHostname(normalized)) return allowLocalhost && normalized === "localhost";
  // Production callbacks must be DNS names. Rejecting all IP literals avoids SSRF,
  // private-range edge cases, and bypassing the DNS ownership challenge.
  const ipLiteral = normalized.replace(/^\[/, "").replace(/\]$/, "");
  if (ipLiteral.includes(":")) return false;
  const octets = ipLiteral.split(".");
  if (octets.length === 4 && octets.every((octet) => /^\d+$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255)) {
    return false;
  }
  return true;
}

export function isProductionLaunchpadCallback(returnUrl: string): boolean {
  const normalized = normalizePartnerReturnUrlForAllowlist(returnUrl);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" && isSafeLaunchpadCallbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function hasProductionLaunchpadCallback(allowedUrls: string[]): boolean {
  return allowedUrls.some(isProductionLaunchpadCallback);
}
