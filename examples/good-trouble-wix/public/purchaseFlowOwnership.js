// FILE: examples/good-trouble-wix/public/purchaseFlowOwnership.js
// Cross-tab purchase flow ownership cookie — complements sessionStorage verifier (same browser, not authorization alone).

/** First-party cookie name — value is flowId|ownershipSecret (never the PKCE verifier). */
export const PURCHASE_FLOW_OWNERSHIP_COOKIE = "gt_pkce_flow_own";

export const FLOW_OWNERSHIP_COOKIE_MAX_AGE_SEC = 600;

const COOKIE_SEPARATOR = "|";

/**
 * @param {string} flowId
 * @param {string} ownershipSecret
 */
export function buildFlowOwnershipCookieValue(flowId, ownershipSecret) {
  const id = typeof flowId === "string" ? flowId.trim() : "";
  const secret = typeof ownershipSecret === "string" ? ownershipSecret.trim() : "";
  if (!id || !secret) return "";
  return `${id}${COOKIE_SEPARATOR}${secret}`;
}

/**
 * @param {string | null | undefined} rawCookieHeader
 * @param {string} expectedFlowId
 */
export function parseFlowOwnershipFromCookieHeader(rawCookieHeader, expectedFlowId) {
  const flowId = typeof expectedFlowId === "string" ? expectedFlowId.trim() : "";
  if (!flowId || !rawCookieHeader) return null;

  const parts = rawCookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part.startsWith(`${PURCHASE_FLOW_OWNERSHIP_COOKIE}=`)) continue;
    const encoded = part.slice(PURCHASE_FLOW_OWNERSHIP_COOKIE.length + 1);
    let decoded = "";
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      return null;
    }
    const sep = decoded.indexOf(COOKIE_SEPARATOR);
    if (sep <= 0) return null;
    const cookieFlowId = decoded.slice(0, sep).trim();
    const secret = decoded.slice(sep + 1).trim();
    if (cookieFlowId !== flowId || !secret) return null;
    return { flowId: cookieFlowId, ownershipSecret: secret };
  }
  return null;
}

/**
 * @param {string} documentCookie
 * @param {string} expectedFlowId
 */
export function parseFlowOwnershipFromDocumentCookie(documentCookie, expectedFlowId) {
  return parseFlowOwnershipFromCookieHeader(documentCookie, expectedFlowId);
}

/**
 * @param {(value: string) => void} setCookie
 * @param {string} flowId
 * @param {string} ownershipSecret
 */
export function persistFlowOwnershipCookie(setCookie, flowId, ownershipSecret) {
  const payload = buildFlowOwnershipCookieValue(flowId, ownershipSecret);
  if (!payload) return;
  const encoded = encodeURIComponent(payload);
  setCookie(
    `${PURCHASE_FLOW_OWNERSHIP_COOKIE}=${encoded}; Max-Age=${FLOW_OWNERSHIP_COOKIE_MAX_AGE_SEC}; Path=/; Secure; SameSite=Lax`,
  );
}

/**
 * @param {(name: string) => void} removeCookie
 * @param {string} [flowId]
 */
export function clearFlowOwnershipCookie(removeCookie, flowId) {
  void flowId;
  removeCookie(
    `${PURCHASE_FLOW_OWNERSHIP_COOKIE}=; Max-Age=0; Path=/; Secure; SameSite=Lax`,
  );
}
