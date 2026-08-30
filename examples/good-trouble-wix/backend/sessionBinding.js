// FILE: examples/good-trouble-wix/backend/sessionBinding.js
// Trusted Wix backend session binding — never accept frontend-supplied visitorId.

/**
 * Wix backend trust model:
 * - Logged-in site members: bind nonces to `wix-members-backend` currentMember.id.
 * - Anonymous site visitors: Wix Velo does not expose a server-side, non-spoofable
 *   visitor identity without trusting frontend-supplied values. This reference
 *   fails closed for anonymous sessions rather than inventing a binding.
 *
 * @param {{ memberId?: string | null }} trustedBackendContext
 *   Populate only from Wix backend APIs (e.g. currentMember from wix-members-backend).
 *   Never pass values from page code, query strings, or localStorage.
 * @returns {{ ok: true, sessionBinding: string } | { ok: false, code: string }}
 */
export function resolveTrustedSessionBinding(trustedBackendContext) {
  const memberId = typeof trustedBackendContext?.memberId === "string"
    ? trustedBackendContext.memberId.trim()
    : "";

  if (!memberId) {
    return {
      ok: false,
      code: "anonymous_session_unsupported",
    };
  }

  return {
    ok: true,
    sessionBinding: `member:${memberId}`,
  };
}
