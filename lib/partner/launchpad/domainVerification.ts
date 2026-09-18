// FILE: lib/partner/launchpad/domainVerification.ts
// DNS proof makes automatic production activation safe without a human queue.

import { randomBytes } from "crypto";
import { isProductionLaunchpadCallback } from "./productionCallbackReadiness";

export const DOMAIN_VERIFICATION_PREFIX = "_abraxas-verification";
export const DOMAIN_VERIFICATION_VALUE_PREFIX = "abraxas-domain-verification=";

export function productionCallbackHostname(returnUrl: string): string | null {
  if (!isProductionLaunchpadCallback(returnUrl)) return null;
  try {
    return new URL(returnUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function domainVerificationRecordName(hostname: string): string {
  return `${DOMAIN_VERIFICATION_PREFIX}.${hostname.toLowerCase()}`;
}

export function domainVerificationRecordValue(token: string): string {
  return `${DOMAIN_VERIFICATION_VALUE_PREFIX}${token}`;
}

export function createDomainVerificationToken(): string {
  return randomBytes(24).toString("base64url");
}

export function dnsTxtRecordsContainToken(records: string[][], token: string): boolean {
  const expected = domainVerificationRecordValue(token);
  return records.some((parts) => parts.join("") === expected);
}

export function isVerifiedDomainForCallbacks(input: {
  allowedReturnUrls: string[];
  verifiedHostnames: string[];
}): boolean {
  const verified = new Set(input.verifiedHostnames.map((hostname) => hostname.toLowerCase()));
  return input.allowedReturnUrls.some((url) => {
    const hostname = productionCallbackHostname(url);
    return hostname !== null && verified.has(hostname);
  });
}
