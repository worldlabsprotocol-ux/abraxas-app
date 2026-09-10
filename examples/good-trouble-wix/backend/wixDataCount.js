// FILE: examples/good-trouble-wix/backend/wixDataCount.js
// Normalizes Wix Data count() results — some Velo runtimes return object-shaped counts.

/**
 * @param {unknown} value
 * @returns {number | null} Safe non-negative integer count, or null when unusable.
 */
export function normalizeWixDataCount(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate = value.totalCount ?? value.count ?? value.total;
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
      return candidate;
    }
  }

  return null;
}
