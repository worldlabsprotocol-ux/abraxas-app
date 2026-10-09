// FILE: examples/good-trouble-wix/backend/returnDestinationPath.js
// Trusted same-origin return paths for post-verification continuation.

import { PURCHASE_POST_VERIFICATION_FALLBACK } from "./constants.js";

/** Callback pages must never be stored or returned as shopping destinations. */
export const BLOCKED_RETURN_PATHS = new Set([
  "/age-verification-result",
  "/browse-verification-result",
  "/purchase-verification",
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
 * Resolve the authoritative post-verification destination.
 * Server-stored path wins; session path is a legacy fallback only at start time.
 *
 * @param {{
 *   serverDestination?: string | null,
 *   sessionDestination?: string | null,
 * }} input
 * @returns {string}
 */
export function resolveAuthoritativeReturnDestination(input) {
  const fromServer = normalizeReturnDestinationPath(input.serverDestination);
  if (fromServer) return fromServer;

  const fromSession = normalizeReturnDestinationPath(input.sessionDestination);
  if (fromSession) return fromSession;

  return PURCHASE_POST_VERIFICATION_FALLBACK;
}

/**
 * Pick destination to persist when starting a purchase flow.
 *
 * @param {{
 *   requestedPath?: string | null,
 *   sessionPath?: string | null,
 *   currentPath?: string | null,
 * }} input
 * @returns {string}
 */
export function resolvePurchaseStartDestination(input) {
  const requested = normalizeReturnDestinationPath(input.requestedPath);
  if (requested) return requested;

  const session = normalizeReturnDestinationPath(input.sessionPath);
  if (session) return session;

  const current = normalizeReturnDestinationPath(input.currentPath);
  if (current) return current;

  return PURCHASE_POST_VERIFICATION_FALLBACK;
}
