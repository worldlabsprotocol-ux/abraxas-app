// FILE: examples/good-trouble-wix/pages/verificationCallbackLogic.js
// Shared, testable callback logic for browse and purchase lifecycles.

/**
 * @param {Record<string, unknown>} query
 * @param {Set<string>} allowedParams
 */
export function parseAllowlistedCallbackParams(query, allowedParams) {
  const parsed = {};
  for (const key of Object.keys(query ?? {})) {
    if (allowedParams.has(key)) {
      parsed[key] = query[key];
    }
  }
  return parsed;
}

/**
 * @param {string | undefined | null} destination
 * @returns {boolean}
 */
export function isSafeReturnDestination(destination) {
  return Boolean(
    destination
    && typeof destination === "string"
    && destination.startsWith("/")
    && !destination.startsWith("//"),
  );
}

/**
 * @param {{
 *   flowParam: string,
 *   flowId: string,
 *   verifier: string | null,
 *   credential: string,
 * }} input
 */
export function validateCallbackInputs(input) {
  if (!input.flowId || !input.credential) {
    return { ok: false, code: "missing_callback_params" };
  }
  if (!input.verifier) {
    return { ok: false, code: "missing_verifier" };
  }
  return { ok: true };
}
