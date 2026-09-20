// FILE: lib/privacy/selectiveDisclosure/untrustedQuery.ts
// Callback and browser query input is never authority and must not leak into outputs.

import { SELECTIVE_DISCLOSURE_CLIENT_OVERRIDE_KEYS } from "./contract";
import { failClosedDisclosureError } from "./enforce";
import { holderVisibleSearch } from "./consentUrl";

export const UNTRUSTED_QUERY_KEYS = [
  "return",
  "return_url",
  "callback",
  "callback_url",
  "receipt",
  "receipt_id",
  "decision",
  "status",
  "decision_id",
  "policy_id",
  "partner_id",
  "policy_version",
  "environment",
  "id_token",
  "oauth",
  "jwt",
  "email",
  "legal_name",
  "wallet",
  "wallet_address",
  "disclosure_profile",
  "claim_allowlist",
] as const;

export function safeCallbackClientErrors(errors: readonly string[]): string[] {
  const out = new Set<string>();
  for (const error of errors) {
    if (error === "receipt_id_missing") {
      out.add("receipt_id_missing");
      continue;
    }
    if (error.startsWith("pii_in_callback") || error.startsWith("unknown_callback_param")) {
      out.add("callback_untrusted");
      continue;
    }
    out.add("invalid");
  }
  return Array.from(out);
}

export function sanitizeUntrustedQueryForClient(
  search: string | URLSearchParams | Record<string, string | string[] | undefined>,
): { search: string; stripped: boolean; error: { error: string } | null } {
  const params = search instanceof URLSearchParams
    ? new URLSearchParams(search)
    : typeof search === "string"
      ? new URLSearchParams(search.replace(/^\?/, ""))
      : new URLSearchParams(
          Object.entries(search).flatMap(([key, value]) => {
            if (value == null) return [];
            return Array.isArray(value) ? value.map((item) => [key, item] as [string, string]) : [[key, value]];
          }),
        );
  const keys = Array.from(params.keys());
  const stripped = keys.some((key) => (
    (UNTRUSTED_QUERY_KEYS as readonly string[]).includes(key)
    || (SELECTIVE_DISCLOSURE_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key)
    || key !== "verify_request"
  ));
  const visible = holderVisibleSearch(params);
  return {
    search: visible.toString(),
    stripped,
    error: stripped ? failClosedDisclosureError("client_override_rejected") : null,
  };
}

export function safeQueryErrorMessage(): { error: string } {
  return failClosedDisclosureError("client_override_rejected");
}
