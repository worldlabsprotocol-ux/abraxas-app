// FILE: lib/policy/changeControl/issuance.ts
// Fail-closed issuance and evaluation gates. Drafts never issue production receipts.

import type { PartnerPolicy } from "@/lib/policy/types";
import { isPolicyDraft, isPublishedPolicyStatus } from "@/lib/policy/policyLifecycle";
import {
  PolicyChangeControlError,
  type PolicyChangeControlCode,
} from "@/lib/policy/changeControl/codes";

export type PolicyIssuanceMode = "production_receipt" | "historical_evaluate" | "fixture_simulate";

export interface PolicyVersionGateInput {
  policy: PartnerPolicy | null;
  partnerId: string;
  expectedVersion?: number | null;
  now?: Date;
  mode: PolicyIssuanceMode;
}

export interface PolicyVersionGateResult {
  ok: true;
  policy: PartnerPolicy;
  code: null;
}

export interface PolicyVersionGateFailure {
  ok: false;
  policy: PartnerPolicy | null;
  code: PolicyChangeControlCode;
}

export type PolicyVersionGate = PolicyVersionGateResult | PolicyVersionGateFailure;

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function evaluatePolicyVersionGate(input: PolicyVersionGateInput): PolicyVersionGate {
  const nowMs = (input.now ?? new Date()).getTime();

  if (input.expectedVersion != null && (input.expectedVersion < 1 || Number.isNaN(input.expectedVersion))) {
    return { ok: false, policy: input.policy, code: "policy_version_missing" };
  }

  if (!input.policy) {
    return {
      ok: false,
      policy: null,
      code: input.expectedVersion != null ? "policy_version_unknown" : "policy_version_missing",
    };
  }

  if (input.policy.partner_id !== input.partnerId) {
    return { ok: false, policy: input.policy, code: "policy_wrong_partner" };
  }

  if (input.expectedVersion != null && input.policy.version !== input.expectedVersion) {
    return { ok: false, policy: input.policy, code: "policy_version_mismatched" };
  }

  if (input.mode === "fixture_simulate") {
    return { ok: true, policy: input.policy, code: null };
  }

  if (input.mode === "historical_evaluate") {
    if (isPolicyDraft(input.policy.status)) {
      return { ok: false, policy: input.policy, code: "policy_version_draft" };
    }
    return { ok: true, policy: input.policy, code: null };
  }

  if (isPolicyDraft(input.policy.status)) {
    return { ok: false, policy: input.policy, code: "policy_version_draft" };
  }

  const effectiveAt = parseTime(input.policy.effective_at ?? null);
  if (effectiveAt != null && effectiveAt > nowMs) {
    return { ok: false, policy: input.policy, code: "policy_version_not_yet_effective" };
  }

  const deprecateAt = parseTime(input.policy.deprecate_effective_at ?? null);
  if (input.policy.status === "deprecated" && deprecateAt != null && deprecateAt <= nowMs) {
    return { ok: false, policy: input.policy, code: "policy_version_deprecated" };
  }
  if (input.policy.status === "active" && deprecateAt != null && deprecateAt <= nowMs) {
    return { ok: false, policy: input.policy, code: "policy_version_deprecated" };
  }

  if (!isPublishedPolicyStatus(input.policy.status)) {
    return { ok: false, policy: input.policy, code: "policy_version_unknown" };
  }

  return { ok: true, policy: input.policy, code: null };
}

export function assertPolicyVersionIssuable(input: Omit<PolicyVersionGateInput, "mode"> & { mode?: PolicyIssuanceMode }): PartnerPolicy {
  const result = evaluatePolicyVersionGate({ ...input, mode: input.mode ?? "production_receipt" });
  if (!result.ok) {
    throw new PolicyChangeControlError(result.code);
  }
  return result.policy;
}

export function draftCannotIssueProductionReceipt(status: string): boolean {
  return isPolicyDraft(status);
}
