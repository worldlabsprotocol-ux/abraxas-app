// FILE: examples/good-trouble-wix/public/browseCallbackHygiene.js
// Strip sensitive Abraxas callback query params from the address bar (UI hygiene only).

/** Query params that must never remain visible after a browse/purchase callback. */
export const SENSITIVE_CALLBACK_QUERY_PARAMS = [
  "browse_receipt",
  "browse_receipt_id",
  "purpose",
  "policy_id",
  "partner_id",
  "gtb",
  "gtv",
  "receipt_id",
  "decision_id",
  "status",
  "credential_id",
  "receipt_expires_at",
  "token",
  "access_token",
  "id_token",
  "code",
];

/**
 * @param {string | URLSearchParams | Record<string, string>} input
 * @returns {boolean}
 */
export function hasSensitiveCallbackQueryParams(input) {
  const keys = normalizeQueryKeys(input);
  return SENSITIVE_CALLBACK_QUERY_PARAMS.some((param) => keys.has(param));
}

/**
 * @param {string} href
 * @param {readonly string[]} [paramsToRemove]
 * @returns {{ href: string, changed: boolean, pathname: string, search: string }}
 */
export function buildHrefWithoutSensitiveParams(href, paramsToRemove = SENSITIVE_CALLBACK_QUERY_PARAMS) {
  const url = new URL(href);
  let changed = false;

  for (const key of paramsToRemove) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  const search = url.searchParams.toString();
  const normalizedSearch = search ? `?${search}` : "";
  const cleanHref = `${url.origin}${url.pathname}${normalizedSearch}${url.hash}`;

  return {
    href: cleanHref,
    changed,
    pathname: url.pathname,
    search: normalizedSearch,
  };
}

/**
 * Remove sensitive callback params from the visible URL. Does not validate receipts.
 * @param {string} href
 * @param {(state: null, title: string, url: string) => void} replaceState
 * @param {readonly string[]} [paramsToRemove]
 * @returns {string}
 */
export function stripSensitiveCallbackParamsFromHref(href, replaceState, paramsToRemove = SENSITIVE_CALLBACK_QUERY_PARAMS) {
  const cleaned = buildHrefWithoutSensitiveParams(href, paramsToRemove);
  if (cleaned.changed) {
    const relative = `${cleaned.pathname}${cleaned.search}`;
    replaceState(null, "", relative);
    return relative;
  }
  return `${cleaned.pathname}${cleaned.search}`;
}

/**
 * @param {string | URLSearchParams | Record<string, string>} input
 * @returns {Set<string>}
 */
function normalizeQueryKeys(input) {
  if (input instanceof URLSearchParams) {
    return new Set(input.keys());
  }
  if (typeof input === "string") {
    const query = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
    return new Set(new URLSearchParams(query).keys());
  }
  return new Set(Object.keys(input));
}
