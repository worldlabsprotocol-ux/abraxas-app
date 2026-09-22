/** Operator-controlled sandbox test result. Not live KYB. */

import { productionReviewCsrfRejected } from "@/lib/partner/launchpad/productionReview/csrf";
import type { NextRequest } from "next/server";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";

export const SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL = "sandbox_test_only" as const;
export const SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS = "operator_sandbox_institutional_result" as const;
export const SANDBOX_INSTITUTIONAL_OPERATOR_TTL_MS = 5 * 60 * 1000;
export const SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE =
  "Sandbox test result for technical integration only. It is not a live KYB or Production approval.";

export const SANDBOX_INSTITUTIONAL_OPERATOR_CREATE_KEYS = ["application_id", "confirm"] as const;
export const SANDBOX_INSTITUTIONAL_OPERATOR_REVOKE_KEYS = ["application_id", "organization_ref", "confirm"] as const;

export const SANDBOX_INSTITUTIONAL_OPERATOR_FORBIDDEN_KEYS = [
  "policy_id",
  "policy_version",
  "issuer",
  "assurance",
  "signer",
  "network",
  "organization_result",
  "receipt_id",
  "environment",
  "action",
  "action_scope",
  "partner_id",
  "legal_name",
  "wallet",
  "callback_url",
  "production",
] as const;

export function sandboxInstitutionalOperatorCsrfRejected(req: NextRequest) {
  return productionReviewCsrfRejected(req);
}

export function sandboxInstitutionalOperatorOverride(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.some((key) => !allowed.includes(key))) return true;
  return SANDBOX_INSTITUTIONAL_OPERATOR_FORBIDDEN_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(body, key),
  );
}

export function sandboxInstitutionalOperatorCopy() {
  return {
    result_label: SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policy_version: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
    action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
    notice: SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE,
    policy_notice: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
    live_kyb: false as const,
    production_approval: false as const,
    public_creation: false as const,
  };
}
