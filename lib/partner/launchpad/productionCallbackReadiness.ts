// FILE: lib/partner/launchpad/productionCallbackReadiness.ts
// Production promotion requires a real HTTPS callback; localhost remains sandbox-only.

import { normalizePartnerReturnUrlForAllowlist } from "@/lib/connect/returnUrlAllowlistSemantics";
import { isIP } from "net";
import { isPublicWebhookIp } from "@/lib/partner/webhooks/webhookPublicIp";

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
  const ipLiteral = normalized.replace(/^\[/, "").replace(/\]$/, "");
  if (isIP(ipLiteral) !== 0) return isPublicWebhookIp(ipLiteral);
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
