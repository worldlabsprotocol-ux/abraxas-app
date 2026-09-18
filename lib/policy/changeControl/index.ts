// FILE: lib/policy/changeControl/index.ts
// Policy Change Control public surface.

export {
  POLICY_CHANGE_CONTROL_CODES,
  POLICY_LIFECYCLE_AUDIT_EVENTS,
  PolicyChangeControlError,
  type PolicyChangeControlCode,
  type PolicyLifecycleAuditEvent,
} from "@/lib/policy/changeControl/codes";

export {
  comparePolicyVersions,
  policyVersionSurface,
  POLICY_WITHHELD_FIELDS,
  type PolicyVersionComparison,
  type PolicyVersionCompatibility,
  type PolicyVersionSurface,
} from "@/lib/policy/changeControl/compare";

export {
  evaluatePolicyVersionGate,
  assertPolicyVersionIssuable,
  draftCannotIssueProductionReceipt,
  type PolicyIssuanceMode,
} from "@/lib/policy/changeControl/issuance";

export {
  validatePolicyDraftForPublish,
  assertDraftPublishable,
} from "@/lib/policy/changeControl/validateDraft";

export {
  evaluatePolicyFixture,
  fixtureInputContainsForbiddenKeys,
  POLICY_FIXTURE_LABEL,
  type PolicyFixtureResult,
  type PolicyFixtureClaimInput,
} from "@/lib/policy/changeControl/fixture";

export {
  derivePolicyChangeControlHealth,
  type PolicyChangeControlHealth,
} from "@/lib/policy/changeControl/health";

export { adoptPolicyVersionForApplication } from "@/lib/policy/changeControl/adoption";
export { buildPolicyChangeControlOverview } from "@/lib/policy/changeControl/overview";
export {
  createPartnerPolicyDraftSuccessor,
  editPartnerPolicyDraft,
  publishPartnerPolicyDraftVersion,
  deprecatePartnerPolicyVersion,
  deletePartnerPolicyDraft,
  resolveIssuablePolicyForPartner,
  loadPartnerPolicyFamily,
  assertPartnerOwnsPolicy,
} from "@/lib/policy/changeControl/lifecycle";
