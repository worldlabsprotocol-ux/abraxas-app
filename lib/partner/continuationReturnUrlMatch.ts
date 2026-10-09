// FILE: lib/partner/continuationReturnUrlMatch.ts
// Structured return URL comparison for partner flow continuations — fail closed on origin/path/token drift.

import {
  GOOD_TROUBLE_BROWSE_CALLBACK_PATH,
  GOOD_TROUBLE_BROWSE_RC_PARAM,
  GOOD_TROUBLE_GTB_PARAM,
  GOOD_TROUBLE_FLOW_ID_RE,
  GOOD_TROUBLE_GTV_PARAM,
  GOOD_TROUBLE_PURCHASE_CALLBACK_PATH,
  GOOD_TROUBLE_RETURN_HOST,
} from "@/lib/partner/normalizePartnerVerifyInput";

export type ContinuationReturnUrlParts = {
  origin: string;
  pathname: string;
  flowToken: string | null;
};

function parseHttpsUrl(url: string): URL | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "") || "/";
}

/** Extract Good Trouble opaque flow token (gtv/gtf_* or gtb/gtb_*). */
export function extractGoodTroubleFlowToken(url: string): string | null {
  const parsed = parseHttpsUrl(url);
  if (!parsed) return null;
  if (parsed.hostname !== GOOD_TROUBLE_RETURN_HOST) return null;

  const gtv = parsed.searchParams.get(GOOD_TROUBLE_GTV_PARAM)?.trim();
  if (gtv?.startsWith("gtf_")) return gtv;

  const gtb = parsed.searchParams.get(GOOD_TROUBLE_GTB_PARAM)?.trim();
  if (gtb?.startsWith("gtb_")) return gtb;

  return null;
}

export function decomposeContinuationReturnUrl(url: string): ContinuationReturnUrlParts | null {
  const parsed = parseHttpsUrl(url);
  if (!parsed) return null;

  return {
    origin: parsed.origin,
    pathname: normalizePathname(parsed.pathname),
    flowToken: extractGoodTroubleFlowToken(url),
  };
}

/**
 * Compare stored vs candidate partner return URLs for continuation binding.
 * Origin and pathname must match. Good Trouble flow tokens (gtv/gtb) must match when present.
 * Ignores Wix browse routing hint (rc=test-site) and parameter ordering only.
 */
export function partnerContinuationReturnUrlsMatch(stored: string, candidate: string): boolean {
  const a = stored.trim();
  const b = candidate.trim();
  if (!a || !b) return false;
  if (a === b) return true;

  const storedParts = decomposeContinuationReturnUrl(a);
  const candidateParts = decomposeContinuationReturnUrl(b);
  if (!storedParts || !candidateParts) return false;

  if (storedParts.origin !== candidateParts.origin) return false;
  if (storedParts.pathname !== candidateParts.pathname) return false;

  if (storedParts.flowToken || candidateParts.flowToken) {
    return storedParts.flowToken === candidateParts.flowToken;
  }

  return true;
}

/** Pick the richer authoritative URL (prefers the variant that includes a flow token). */
/**
 * Merge allowlisted Good Trouble purchase callback with partner hint that carries gtv.
 * Strips untrusted hint query params — only the opaque gtf_* flow id is kept.
 */
/** True when client hint may upgrade a bare allowlisted purchase callback with gtv. */
export function goodTroublePurchaseReturnUrlBindingAllowed(
  stored: string,
  clientHint: string,
): boolean {
  if (partnerContinuationReturnUrlsMatch(stored, clientHint)) return true;
  const coalesced = coalesceGoodTroublePurchaseReturnUrl(stored, clientHint);
  if (coalesced === stored.trim()) return false;
  const storedParts = decomposeContinuationReturnUrl(stored);
  const coalescedParts = decomposeContinuationReturnUrl(coalesced);
  if (!storedParts || !coalescedParts) return false;
  return (
    storedParts.origin === coalescedParts.origin
    && storedParts.pathname === coalescedParts.pathname
    && Boolean(coalescedParts.flowToken?.startsWith("gtf_"))
  );
}

export function coalesceGoodTroublePurchaseReturnUrl(
  storedOrAllowlisted: string,
  partnerHint: string,
): string {
  const stored = storedOrAllowlisted.trim();
  const hint = partnerHint.trim();
  if (!hint) return stored;

  const storedParts = decomposeContinuationReturnUrl(stored);
  const hintParts = decomposeContinuationReturnUrl(hint);
  if (!storedParts || !hintParts) return stored;
  if (storedParts.origin !== hintParts.origin) return stored;
  if (storedParts.pathname !== hintParts.pathname) return stored;
  if (!isGoodTroublePurchaseCallbackPath(storedParts.pathname)) return stored;

  const hintToken = hintParts.flowToken;
  if (!hintToken?.startsWith("gtf_") || !GOOD_TROUBLE_FLOW_ID_RE.test(hintToken)) {
    return stored;
  }
  if (storedParts.flowToken && storedParts.flowToken !== hintToken) {
    return stored;
  }

  return `${storedParts.origin}${storedParts.pathname}?${GOOD_TROUBLE_GTV_PARAM}=${encodeURIComponent(hintToken)}`;
}

/** Merge partner return URL hints (client, resume) without widening origin/path/token binding. */
export function mergePartnerReturnUrlHints(...parts: (string | null | undefined)[]): string {
  let merged = "";
  for (const part of parts) {
    const hint = part?.trim();
    if (!hint) continue;
    if (!merged) {
      merged = hint;
      continue;
    }
    merged = preferAuthoritativeContinuationReturnUrl(
      merged,
      coalesceGoodTroublePurchaseReturnUrl(merged, hint),
    );
  }
  return merged;
}

export function preferAuthoritativeContinuationReturnUrl(
  stored: string,
  candidate: string,
): string {
  const storedToken = extractGoodTroubleFlowToken(stored);
  const candidateToken = extractGoodTroubleFlowToken(candidate);
  if (candidateToken && !storedToken) return candidate.trim();
  if (storedToken && !candidateToken) return stored.trim();
  if (partnerContinuationReturnUrlsMatch(stored, candidate)) {
    return storedToken ? stored.trim() : candidate.trim();
  }
  return stored.trim();
}

export function isGoodTroublePurchaseCallbackPath(pathname: string): boolean {
  return normalizePathname(pathname) === GOOD_TROUBLE_PURCHASE_CALLBACK_PATH;
}

export function isGoodTroubleBrowseCallbackPath(pathname: string): boolean {
  return normalizePathname(pathname) === GOOD_TROUBLE_BROWSE_CALLBACK_PATH;
}

/** Strip Wix browse routing hint before persisting purchase continuations (never on purchase paths). */
export function stripGoodTroubleBrowseRoutingHint(returnUrl: string): string {
  const parsed = parseHttpsUrl(returnUrl);
  if (!parsed) return returnUrl;
  if (parsed.pathname !== GOOD_TROUBLE_BROWSE_CALLBACK_PATH) return returnUrl;
  if (parsed.searchParams.get(GOOD_TROUBLE_BROWSE_RC_PARAM) !== "test-site") return returnUrl;
  parsed.searchParams.delete(GOOD_TROUBLE_BROWSE_RC_PARAM);
  const qs = parsed.searchParams.toString();
  return `${parsed.origin}${parsed.pathname}${qs ? `?${qs}` : ""}`;
}
