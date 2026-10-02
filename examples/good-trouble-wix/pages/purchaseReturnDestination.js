// FILE: examples/good-trouble-wix/pages/purchaseReturnDestination.js
// Wix deployment: copy to src/public/purchaseReturnDestination.js

import { PURCHASE_FROM_QUERY_PARAM } from "../public/abraxasClientConstants.js";

const BLOCKED_RETURN_PATHS = new Set([
  "/age-verification-result",
  "/browse-verification-result",
]);

/**
 * @param {string | null | undefined} destination
 * @returns {boolean}
 */
export function isSafeReturnDestinationPath(destination) {
  if (!destination || typeof destination !== "string") return false;
  const trimmed = destination.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  if (trimmed.includes("?")) return false;
  if (trimmed.includes("#")) return false;
  const pathOnly = trimmed.split("?")[0].split("#")[0];
  if (BLOCKED_RETURN_PATHS.has(pathOnly)) return false;
  if (pathOnly.length > 256) return false;
  return true;
}

/**
 * @param {string | null | undefined} path
 * @returns {string | null}
 */
export function normalizeReturnDestinationPath(path) {
  if (!isSafeReturnDestinationPath(path)) return null;
  return path.trim().split("?")[0].split("#")[0];
}

/**
 * @param {Record<string, unknown>} query
 */
export function parsePurchaseEntryFromQuery(query) {
  const raw = query?.[PURCHASE_FROM_QUERY_PARAM];
  if (typeof raw !== "string") return null;
  return normalizeReturnDestinationPath(raw);
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function extractSameOriginPath(url) {
  if (!url || typeof url !== "string") return null;
  const path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "") || "/";
  return normalizeReturnDestinationPath(path);
}

/**
 * @param {{
 *   sessionDestination?: string | null,
 *   queryFrom?: string | null,
 *   currentUrl?: string | null,
 * }} input
 * @returns {string | null}
 */
export function resolvePurchaseReturnDestinationForStart(input) {
  const fromQuery = normalizeReturnDestinationPath(input.queryFrom);
  if (fromQuery) return fromQuery;

  const fromSession = normalizeReturnDestinationPath(input.sessionDestination);
  if (fromSession) return fromSession;

  return extractSameOriginPath(input.currentUrl);
}

/**
 * @param {Record<string, unknown>} query
 */
export function hasUntrustedRedirectQueryParams(query) {
  const blocked = ["next", "redirect", "return_url", "destination", "continue", "goto"];
  return blocked.some((key) => typeof query?.[key] === "string" && query[key]);
}
