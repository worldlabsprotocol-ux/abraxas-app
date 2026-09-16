// FILE: lib/partner/launchpad/launchpadReturnUrlAllowlist.ts
// Launchpad return URL allowlist — stricter than generic partner prefix matching.

import {
  normalizePartnerReturnUrlForAllowlist,
  partnerReturnUrlMatchesAllowlistEntry,
} from "@/lib/connect/returnUrlAllowlistSemantics";

function allowlistEntryHasCallbackPath(allowlistEntry: string): boolean {
  const normalized = normalizePartnerReturnUrlForAllowlist(allowlistEntry);
  if (!normalized) return false;
  try {
    const pathname = new URL(normalized).pathname;
    return pathname !== "/" && pathname.length > 0;
  } catch {
    return false;
  }
}

function returnUrlHasExtraPathBeyondOrigin(returnUrl: string, originEntry: string): boolean {
  const normalizedReturn = normalizePartnerReturnUrlForAllowlist(returnUrl);
  const normalizedOrigin = normalizePartnerReturnUrlForAllowlist(originEntry);
  if (!normalizedReturn || !normalizedOrigin) return true;
  try {
    const returnParsed = new URL(normalizedReturn);
    const originParsed = new URL(normalizedOrigin);
    if (returnParsed.origin !== originParsed.origin) return true;
    const path = returnParsed.pathname.replace(/\/$/, "");
    return path.length > 0;
  } catch {
    return true;
  }
}

export function isLaunchpadReturnUrlAllowlisted(
  allowedUrls: string[] | null | undefined,
  returnUrl: string,
): boolean {
  if (!allowedUrls?.length) return false;

  const normalizedReturn = normalizePartnerReturnUrlForAllowlist(returnUrl);
  if (!normalizedReturn) return false;

  return allowedUrls.some((entry) => {
    if (!allowlistEntryHasCallbackPath(entry)) {
      if (returnUrlHasExtraPathBeyondOrigin(returnUrl, entry)) return false;
      return normalizedReturn === normalizePartnerReturnUrlForAllowlist(entry);
    }
    return partnerReturnUrlMatchesAllowlistEntry(normalizedReturn, entry);
  });
}
