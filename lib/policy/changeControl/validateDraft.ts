// FILE: lib/policy/changeControl/validateDraft.ts
// Server-side validation required before a draft can be published.

import type { PartnerPolicy, PartnerPolicyRules } from "@/lib/policy/types";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";
import { isPolicyDraft } from "@/lib/policy/policyLifecycle";

const FORBIDDEN_RULE_KEYS = [
  "executable",
  "javascript",
  "wasm",
  "eval",
  "google_oauth",
  "id_token",
  "wallet_secret",
];

export interface DraftPublishValidation {
  ok: boolean;
  code: "policy_publish_invalid" | "policy_version_draft" | "policy_version_unknown" | null;
  errors: string[];
}

export function validatePolicyDraftForPublish(policy: PartnerPolicy | null): DraftPublishValidation {
  if (!policy) {
    return { ok: false, code: "policy_version_unknown", errors: ["policy_version_unknown"] };
  }
  if (!isPolicyDraft(policy.status)) {
    return { ok: false, code: "policy_version_draft", errors: ["only_draft_versions_can_be_published"] };
  }

  const errors: string[] = [];
  const rules: PartnerPolicyRules = policy.rules_json ?? {};

  if (!policy.name?.trim()) errors.push("policy_name_required");

  const hasClaims = (rules.required_claims ?? []).length > 0;
  if (!hasClaims && !rules.allow_core_only && !rules.browse_access_only) {
    errors.push("required_claims_or_browse_or_core_only");
  }

  for (const rule of rules.required_claims ?? []) {
    if (!rule.claim_type?.trim()) errors.push("required_claim_type_missing");
  }

  const blob = JSON.stringify(rules).toLowerCase();
  for (const key of FORBIDDEN_RULE_KEYS) {
    if (blob.includes(key)) errors.push(`forbidden_rule_key:${key}`);
  }

  if (blob.includes("google") && (blob.includes("eligibility") || blob.includes("age") || blob.includes("kyc"))) {
    errors.push("google_zklogin_is_account_only");
  }

  return {
    ok: errors.length === 0,
    code: errors.length === 0 ? null : "policy_publish_invalid",
    errors,
  };
}

export function assertDraftPublishable(policy: PartnerPolicy | null): PartnerPolicy {
  const result = validatePolicyDraftForPublish(policy);
  if (!result.ok || !policy) {
    throw new PolicyChangeControlError(result.code ?? "policy_publish_invalid", result.errors.join(","));
  }
  return policy;
}
