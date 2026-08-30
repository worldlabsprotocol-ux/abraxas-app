// FILE: examples/good-trouble-wix/backend/sha256Adapter.js
// Backend-only SHA-256 for PKCE verifier challenges.
// Uses node:crypto createHash — supported in Wix Node.js backend (same runtime as pkceProof.js).

import { createHash } from "node:crypto";

/**
 * SHA-256 digest as lowercase 64-character hex.
 * @param {string} value UTF-8 input
 * @returns {string}
 */
export function sha256HexSync(value) {
  if (typeof value !== "string") {
    throw new TypeError("sha256 input must be a string");
  }
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Async wrapper for callers that expect a Promise (PKCE lifecycle).
 * @param {string} value UTF-8 input
 * @returns {Promise<string>}
 */
export async function sha256Hex(value) {
  return sha256HexSync(value);
}
