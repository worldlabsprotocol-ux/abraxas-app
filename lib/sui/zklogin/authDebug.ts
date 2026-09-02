// FILE: lib/sui/zklogin/authDebug.ts
// Client-side auth lifecycle instrumentation — no secrets, tokens, or persistent identifiers.

export type AuthDebugEvent =
  | "oauth_start"
  | "oauth_redirect"
  | "oauth_callback"
  | "oauth_callback_error"
  | "zklogin_complete"
  | "zklogin_complete_error"
  | "session_saved"
  | "session_loaded"
  | "session_cleared"
  | "browser_session_mint"
  | "browser_session_mint_failed"
  | "auth_provider_ready"
  | "auth_provider_authenticated"
  | "login_in_flight_set"
  | "login_in_flight_cleared"
  | "wallet_signing_ready"
  | "wallet_signing_missing";

export type AuthDebugPayload = {
  correlationId?: string;
  hasPending?: boolean;
  hasSigning?: boolean;
  hasEphemeral?: boolean;
  loginInFlight?: boolean;
  authenticated?: boolean;
  ready?: boolean;
  errorCode?: string;
  detail?: string;
};

const PREFIX = "[abraxas-auth]";

const ALLOWED_PAYLOAD_KEYS = new Set<keyof AuthDebugPayload>([
  "correlationId",
  "hasPending",
  "hasSigning",
  "hasEphemeral",
  "loginInFlight",
  "authenticated",
  "ready",
  "errorCode",
  "detail",
]);

const FORBIDDEN_KEY_FRAGMENTS = [
  "suiaddress",
  "sui_address",
  "wallet",
  "email",
  "oauth",
  "sub",
  "token",
  "jwt",
  "session",
  "return_url",
  "returnurl",
  "gtv",
  "receipt",
  "verifier",
  "proof",
  "salt",
  "fingerprint",
  "ip",
  "device",
  "id_token",
  "idtoken",
] as const;

const ALLOWED_DETAIL_VALUES = new Set([
  "existing_session",
  "new_session",
  "login_mode=canonical",
  "login_mode=legacy_recovery",
  "start",
  "ok",
]);

const ALLOWED_ERROR_CODES = new Set([
  "blocked_by_login_in_flight",
  "pending_session_missing",
  "oauth_state_invalid",
  "oauth_token_missing_subject",
  "register_failed",
  "address_mismatch",
  "browser_session_mint_failed",
  "callback_failed",
  "recovery_required",
  "epoch_fetch_failed",
  "oauth_not_configured",
  "redirect_failed",
  "epoch_fetch_failed",
]);

const CORRELATION_ID_PATTERN = /^[a-z]+_[a-f0-9]{6,16}$/i;

export function createAuthCorrelationId(): string {
  const bytes = typeof crypto !== "undefined" && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint8Array(4))
    : null;
  const suffix = bytes
    ? Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    : Math.random().toString(16).slice(2, 10);
  return `auth_${suffix}`;
}

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

export function sanitizeAuthDebugPayload(
  payload: Record<string, unknown> = {},
): AuthDebugPayload {
  const safe: AuthDebugPayload = {};

  for (const [rawKey, rawValue] of Object.entries(payload)) {
    if (isForbiddenKey(rawKey)) continue;
    if (!ALLOWED_PAYLOAD_KEYS.has(rawKey as keyof AuthDebugPayload)) continue;

    if (rawKey === "correlationId" && typeof rawValue === "string") {
      if (CORRELATION_ID_PATTERN.test(rawValue)) safe.correlationId = rawValue;
      continue;
    }

    if (rawKey === "detail" && typeof rawValue === "string") {
      if (ALLOWED_DETAIL_VALUES.has(rawValue)) safe.detail = rawValue;
      continue;
    }

    if (rawKey === "errorCode" && typeof rawValue === "string") {
      if (ALLOWED_ERROR_CODES.has(rawValue)) safe.errorCode = rawValue;
      continue;
    }

    if (
      rawKey === "hasPending"
      || rawKey === "hasSigning"
      || rawKey === "hasEphemeral"
      || rawKey === "loginInFlight"
      || rawKey === "authenticated"
      || rawKey === "ready"
    ) {
      if (typeof rawValue === "boolean") safe[rawKey] = rawValue;
    }
  }

  return safe;
}

export function toAuthErrorCode(input: unknown, fallback = "callback_failed"): string {
  if (typeof input !== "string" || !input.trim()) return fallback;
  const normalized = input.trim().toLowerCase();
  if (ALLOWED_ERROR_CODES.has(normalized)) return normalized;
  if (normalized.includes("already in progress")) return "blocked_by_login_in_flight";
  if (normalized.includes("pending_session_missing") || normalized.includes("lost the temporary signing key")) {
    return "pending_session_missing";
  }
  if (normalized.includes("oauth session expired") || normalized.includes("expired")) return "oauth_state_invalid";
  if (normalized.includes("audience")) return "register_failed";
  return fallback;
}

export function logAuthEvent(event: AuthDebugEvent, payload: AuthDebugPayload = {}): void {
  if (typeof window === "undefined") return;
  const enabled =
    process.env.NODE_ENV !== "production"
    || process.env.NEXT_PUBLIC_ABRAXAS_AUTH_DEBUG === "1";
  if (!enabled) return;

  const safe = sanitizeAuthDebugPayload(payload as Record<string, unknown>);
  console.info(PREFIX, event, safe);
}
