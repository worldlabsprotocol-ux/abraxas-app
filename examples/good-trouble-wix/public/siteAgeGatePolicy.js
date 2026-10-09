// FILE: examples/good-trouble-wix/public/siteAgeGatePolicy.js
// Wix deployment: src/public/siteAgeGatePolicy.js
// UI-only coordination for Wix automatic age lightboxes — never checkout authority.

import { shouldSkipAgeGate } from "./ageGateAccessState.js";

/** Paths where an automatic age lightbox must not interrupt Abraxas callbacks. */
export const AGE_GATE_SUPPRESS_LIGHTBOX_PATHS = [
  "/age-verification-result",
  "/browse-verification-result",
  "/purchase-verification",
];

/**
 * @param {string | null | undefined} pathOrUrl
 * @returns {string}
 */
export function normalizeSitePath(pathOrUrl) {
  const raw = String(pathOrUrl ?? "").trim();
  if (!raw) return "/";
  const withoutQuery = raw.split("?")[0].split("#")[0];
  const pathOnly = withoutQuery.replace(/^https?:\/\/[^/]+/i, "") || "/";
  if (!pathOnly.startsWith("/")) return `/${pathOnly}`;
  return pathOnly.length > 1 && pathOnly.endsWith("/")
    ? pathOnly.slice(0, -1)
    : pathOnly;
}

/**
 * @param {string} normalizedPath
 */
export function isAgeGateCallbackOrEntryPath(normalizedPath) {
  const path = normalizeSitePath(normalizedPath);
  return AGE_GATE_SUPPRESS_LIGHTBOX_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Close or skip Wix Studio automatic age lightbox when Abraxas already verified the session.
 * @param {{
 *   localStorage: Storage,
 *   sessionStorage: Storage,
 *   pagePath?: string | null,
 *   now?: number,
 * }} input
 */
export function shouldSuppressAutomaticAgeLightbox(input) {
  const pagePath = normalizeSitePath(input.pagePath);
  if (isAgeGateCallbackOrEntryPath(pagePath)) {
    return { suppress: true, reason: "callback_or_entry_page" };
  }

  const skip = shouldSkipAgeGate({
    localStorage: input.localStorage,
    sessionStorage: input.sessionStorage,
    now: input.now,
  });
  if (skip.skip) {
    return { suppress: true, reason: skip.reason };
  }

  return { suppress: false, reason: null };
}
