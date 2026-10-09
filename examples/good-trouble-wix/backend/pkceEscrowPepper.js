// FILE: examples/good-trouble-wix/backend/pkceEscrowPepper.js
// PKCE escrow pepper from Wix Secrets Manager — backend only, never exposed to frontend.

/** Wix Secrets Manager secret name (configure in Developer Tools → Secrets). */
export const PKCE_ESCROW_PEPPER_SECRET_NAME = "GOOD_TROUBLE_PKCE_ESCROW_PEPPER";

/** Minimum entropy: 32 bytes. */
export const PKCE_ESCROW_PEPPER_MIN_BYTES = 32;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, pepper: string } | { ok: false, code: "pkce_escrow_secret_invalid" | "pkce_escrow_secret_missing" }}
 */
export function validatePkceEscrowPepperSecret(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    return { ok: false, code: "pkce_escrow_secret_missing" };
  }

  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length >= PKCE_ESCROW_PEPPER_MIN_BYTES * 2) {
    return { ok: true, pepper: trimmed.toLowerCase() };
  }

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length >= PKCE_ESCROW_PEPPER_MIN_BYTES) {
      return { ok: true, pepper: trimmed };
    }
  } catch {
    // fall through
  }

  if (Buffer.byteLength(trimmed, "utf8") >= PKCE_ESCROW_PEPPER_MIN_BYTES) {
    return { ok: true, pepper: trimmed };
  }

  return { ok: false, code: "pkce_escrow_secret_invalid" };
}

/**
 * @param {object} [deps]
 * @param {string} [deps.pepperOverride] test-only injected pepper (must pass validatePkceEscrowPepperSecret)
 * @param {(name: string) => Promise<string>} [deps.getSecret] Wix Secrets Manager `getSecret`
 * @returns {Promise<{ ok: true, pepper: string } | { ok: false, code: string }>}
 */
export async function fetchPkceEscrowPepper(deps = {}) {
  if (deps.pepperOverride != null) {
    return validatePkceEscrowPepperSecret(deps.pepperOverride);
  }

  const getSecret = deps.getSecret;
  if (typeof getSecret !== "function") {
    return { ok: false, code: "pkce_escrow_secret_unavailable" };
  }

  let raw;
  try {
    raw = await getSecret(PKCE_ESCROW_PEPPER_SECRET_NAME);
  } catch {
    return { ok: false, code: "pkce_escrow_secret_unavailable" };
  }

  const validated = validatePkceEscrowPepperSecret(raw);
  if (!validated.ok) {
    return validated;
  }
  return validated;
}
