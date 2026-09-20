// FILE: lib/passport/reusableEligibility/view.ts
// Holder-safe reuse option. No fact, receipt, or source-partner identifiers.

import { applyDisclosureProfile } from "@/lib/privacy/selectiveDisclosure/enforce";
import { GENERIC_MINIMAL_PROFILE } from "@/lib/privacy/selectiveDisclosure/profiles";
import { rejectClientDisclosureConfig } from "@/lib/privacy/selectiveDisclosure/clientOverride";
import {
  REUSE_CLIENT_KEYS,
  REUSE_CONFIRM_POINTS,
  REUSE_CONSENT_STILL_REQUIRED,
  REUSE_EXPIRED,
  REUSE_INCOMPATIBLE,
  REUSE_LABEL,
  REUSE_NONE,
  REUSE_REVOKED,
  REUSE_SANDBOX_BLOCKED,
  REUSE_UNAVAILABLE,
  type ReuseClientState,
  type ReuseClientView,
} from "./contract";

export const REUSE_AUTHORITY_KEYS = [
  "fact_id",
  "source_partner",
  "source_partner_id",
  "source_receipt",
  "source_receipt_id",
  "receipt_id",
  "decision_id",
  "compatible",
  "compatibility",
  "compatibility_type",
  "compatibility_status",
  "edge_id",
  "registry",
  "reviewed_edge",
  "lifecycle",
  "status",
  "callback",
  "return_url",
  "returnUrl",
  "key",
  "api_key",
  "wallet",
  "approval",
  "production",
  "policy_version",
  "environment",
] as const;

export function rejectReuseClientAuthority(body: unknown): boolean {
  if (!rejectClientDisclosureConfig(body).ok) return true;
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.some((key) => (REUSE_AUTHORITY_KEYS as readonly string[]).includes(key));
}

export function buildReuseClientView(state: ReuseClientState): ReuseClientView {
  const explanation = state === "available"
    ? [...REUSE_CONFIRM_POINTS]
    : [messageFor(state)];
  const view: ReuseClientView = {
    available: state === "available",
    state,
    label: REUSE_LABEL,
    explanation,
    consent_still_required: true,
    issuedReceipt: false,
  };
  const sealed = applyDisclosureProfile(
    view,
    {
      ...GENERIC_MINIMAL_PROFILE,
      holder_brief_fields: REUSE_CLIENT_KEYS,
    },
    "holder_brief",
  );
  if (!sealed.ok) {
    return {
      available: false,
      state: "unavailable",
      label: REUSE_LABEL,
      explanation: [REUSE_UNAVAILABLE],
      consent_still_required: true,
      issuedReceipt: false,
    };
  }
  return sealed.payload as unknown as ReuseClientView;
}

function messageFor(state: ReuseClientState): string {
  switch (state) {
    case "expired":
      return REUSE_EXPIRED;
    case "revoked":
      return REUSE_REVOKED;
    case "incompatible":
      return REUSE_INCOMPATIBLE;
    case "sandbox_blocked":
      return REUSE_SANDBOX_BLOCKED;
    case "unavailable":
      return REUSE_UNAVAILABLE;
    default:
      return REUSE_NONE;
  }
}

export { REUSE_CONSENT_STILL_REQUIRED };
