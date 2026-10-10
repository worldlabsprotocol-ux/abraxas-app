// FILE: examples/good-trouble-wix/public/browseFlowOwnership.js
// Cross-tab browse flow ownership cookie — separate from purchase (gt_pkce_flow_own).

/** First-party cookie — value is gtb flowId|ownershipSecret (never the PKCE verifier). */
export const BROWSE_FLOW_OWNERSHIP_COOKIE = "gt_browse_pkce_flow_own";

export const BROWSE_FLOW_OWNERSHIP_COOKIE_MAX_AGE_SEC = 600;

const COOKIE_SEPARATOR = "|";

/**
 * @param {string} flowId
 * @param {string} ownershipSecret
 */
export function buildBrowseFlowOwnershipCookieValue(flowId, ownershipSecret) {
  const id = typeof flowId === "string" ? flowId.trim() : "";
  const secret = typeof ownershipSecret === "string" ? ownershipSecret.trim() : "";
  if (!id || !secret) return "";
  if (!id.startsWith("gtb_")) return "";
  return `${id}${COOKIE_SEPARATOR}${secret}`;
}

/**
 * @param {string | null | undefined} rawCookieHeader
 * @param {string} expectedFlowId
 */
export function parseBrowseFlowOwnershipFromCookieHeader(rawCookieHeader, expectedFlowId) {
  const flowId = typeof expectedFlowId === "string" ? expectedFlowId.trim() : "";
  if (!flowId || !flowId.startsWith("gtb_") || !rawCookieHeader) return null;

  const parts = rawCookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part.startsWith(`${BROWSE_FLOW_OWNERSHIP_COOKIE}=`)) continue;
    const encoded = part.slice(BROWSE_FLOW_OWNERSHIP_COOKIE.length + 1);
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
export function parseBrowseFlowOwnershipFromDocumentCookie(documentCookie, expectedFlowId) {
  return parseBrowseFlowOwnershipFromCookieHeader(documentCookie, expectedFlowId);
}

/**
 * @param {(value: string) => void} setCookie
 * @param {string} flowId
 * @param {string} ownershipSecret
 */
export function persistBrowseFlowOwnershipCookie(setCookie, flowId, ownershipSecret) {
  const payload = buildBrowseFlowOwnershipCookieValue(flowId, ownershipSecret);
  if (!payload) return;
  const encoded = encodeURIComponent(payload);
  setCookie(
    `${BROWSE_FLOW_OWNERSHIP_COOKIE}=${encoded}; Max-Age=${BROWSE_FLOW_OWNERSHIP_COOKIE_MAX_AGE_SEC}; Path=/; Secure; SameSite=Lax`,
  );
}

/**
 * @param {(name: string) => void} removeCookie
 */
export function clearBrowseFlowOwnershipCookie(removeCookie) {
  removeCookie(
    `${BROWSE_FLOW_OWNERSHIP_COOKIE}=; Max-Age=0; Path=/; Secure; SameSite=Lax`,
  );
}
