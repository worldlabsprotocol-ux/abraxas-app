// FILE: lib/policy/changeControl/codes.ts
// Typed fail-closed outcomes for Policy Change Control.

export const POLICY_CHANGE_CONTROL_CODES = [
  "policy_version_missing",
  "policy_version_unknown",
  "policy_version_draft",
  "policy_version_deprecated",
  "policy_version_mismatched",
  "policy_version_not_yet_effective",
  "policy_version_not_adopted",
  "policy_version_has_receipts",
  "policy_version_has_active_bindings",
  "policy_wrong_partner",
  "policy_draft_not_issuable",
  "policy_publish_invalid",
  "policy_immutability_violation",
] as const;

export type PolicyChangeControlCode = (typeof POLICY_CHANGE_CONTROL_CODES)[number];

export class PolicyChangeControlError extends Error {
  readonly code: PolicyChangeControlCode;

  constructor(code: PolicyChangeControlCode, message?: string) {
    super(message ?? code);
    this.name = "PolicyChangeControlError";
    this.code = code;
  }
}

export const POLICY_LIFECYCLE_AUDIT_EVENTS = [
  "created",
  "draft_changed",
  "published",
  "adopted",
  "deprecated",
] as const;

export type PolicyLifecycleAuditEvent = (typeof POLICY_LIFECYCLE_AUDIT_EVENTS)[number];
