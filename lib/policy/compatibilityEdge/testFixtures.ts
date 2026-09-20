// FILE: lib/policy/compatibilityEdge/testFixtures.ts
// Test-only edges. Never loaded as Production registry contents.

import { canonicalizeDisclosureBoundary, type PolicyCompatibilityEdge } from "./types";

const AGE21_WITHHELD = ["date of birth", "government ID images", "legal name", "email"] as const;
const AGE18_WITHHELD = ["date of birth", "government ID images", "legal name", "email"] as const;
const AGE21_BOUNDARY = canonicalizeDisclosureBoundary("age_eligible_21", AGE21_WITHHELD);
const AGE18_BOUNDARY = canonicalizeDisclosureBoundary("age_eligible_18", AGE18_WITHHELD);
const AGE21_BROADER_DISCLOSURE = canonicalizeDisclosureBoundary("age_eligible_21", ["date of birth"]);

export const FIXTURE_ACTIVE_CONTINUITY: PolicyCompatibilityEdge = {
  edge_id: "edge_test_age21_v1_v2",
  source_pack_id: "age_21_retail",
  source_version: 1,
  target_pack_id: "age_21_retail",
  target_version: 2,
  source_minimum_assurance: "L2",
  target_required_assurance: "L2",
  source_method_category: "L2",
  target_method_category: "L2",
  source_result_category: "age_eligible_21",
  target_result_category: "age_eligible_21",
  source_disclosure_boundary: AGE21_BOUNDARY,
  target_disclosure_boundary: AGE21_BOUNDARY,
  source_environment: "production",
  target_environment: "production",
  status: "active",
  effective_at: "2026-01-01T00:00:00.000Z",
  expires_at: null,
  rationale: "Test-only same-pack successor with unchanged assurance, result, disclosure, and environment.",
  compatibility_type: "exact_continuity",
  test_only: true,
};

export const FIXTURE_A_TO_B: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_a_to_b",
  source_version: 1,
  target_version: 2,
};

export const FIXTURE_B_TO_C: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_b_to_c",
  source_version: 2,
  target_version: 3,
};

export const FIXTURE_DEPRECATED: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_deprecated",
  status: "deprecated",
};

export const FIXTURE_REVOKED: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_revoked",
  status: "revoked",
};

export const FIXTURE_EXPIRED_EDGE: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_expired_edge",
  expires_at: "2026-01-02T00:00:00.000Z",
};

export const FIXTURE_NOT_EFFECTIVE: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_future",
  effective_at: "2027-01-01T00:00:00.000Z",
};

export const FIXTURE_ASSURANCE_HIGH_TARGET: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_assurance",
  target_required_assurance: "L4",
};

export const FIXTURE_BROADER_RESULT: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_broader_result",
  source_pack_id: "age_18_retail",
  source_version: 1,
  target_pack_id: "age_21_retail",
  target_version: 1,
  source_minimum_assurance: "L1",
  target_required_assurance: "L2",
  source_method_category: "L1",
  target_method_category: "L2",
  source_result_category: "age_eligible_18",
  target_result_category: "age_eligible_21",
  source_disclosure_boundary: AGE18_BOUNDARY,
  target_disclosure_boundary: AGE21_BOUNDARY,
  compatibility_type: "reviewed_equivalence",
};

export const FIXTURE_BROADER_DISCLOSURE: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_broader_disclosure",
  target_disclosure_boundary: AGE21_BROADER_DISCLOSURE,
};

export const FIXTURE_SANDBOX_TO_PRODUCTION: PolicyCompatibilityEdge = {
  ...FIXTURE_ACTIVE_CONTINUITY,
  edge_id: "edge_test_sandbox_prod",
  source_environment: "sandbox",
  target_environment: "production",
};

export const TEST_REGISTRY_ACTIVE = [FIXTURE_ACTIVE_CONTINUITY];
export const TEST_REGISTRY_TRANSITIVE = [FIXTURE_A_TO_B, FIXTURE_B_TO_C];
