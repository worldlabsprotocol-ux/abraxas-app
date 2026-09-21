// FILE: lib/partner/policyReleaseCandidate/fixtures.ts
// Deterministic contract fixtures only. Never mints receipts or mutates catalog.

import type { SanitizedReleaseShape } from "./sanitize";
import { POLICY_RC_RESULT_LABELS } from "./contract";

export interface PolicyRcFixture {
  id: string;
  invariant: string;
  expect: string;
  must_not: string;
  environment: SanitizedReleaseShape["environment"];
}

export function generateReleaseFixtures(shape: SanitizedReleaseShape): PolicyRcFixture[] {
  const result = POLICY_RC_RESULT_LABELS[shape.result_category];
  const withheld = shape.withheld.join(",");
  const scopes = shape.action_scopes.join(",");
  return [
    {
      id: `${shape.policy_label}:exact_result_allowed`,
      invariant: "exact_result_allowed",
      expect: result,
      must_not: "expanded_result",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:prohibited_data_withheld`,
      invariant: "prohibited_data_withheld",
      expect: withheld,
      must_not: "raw_identity_evidence",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:minimum_method_assurance`,
      invariant: "minimum_method_assurance",
      expect: `${shape.method_category}:${shape.minimum_assurance}`,
      must_not: "weaker_method",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:expired_result`,
      invariant: "expired_result",
      expect: "deny_expired",
      must_not: "reuse_expired",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:revoked_result`,
      invariant: "revoked_result",
      expect: "deny_revoked",
      must_not: "reuse_revoked",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:denied_result`,
      invariant: "denied_result",
      expect: "deny",
      must_not: "treat_as_eligible",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:sandbox_versus_production`,
      invariant: "sandbox_versus_production",
      expect: shape.environment,
      must_not: "silent_production_promotion",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:receipt_verification`,
      invariant: "receipt_verification",
      expect: "verify_public_receipt_fields_only",
      must_not: "mint_receipt",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:disclosure_serialization`,
      invariant: "disclosure_serialization",
      expect: shape.disclosure_profile,
      must_not: "serialize_withheld",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:action_contract_scope`,
      invariant: "action_contract_scope",
      expect: scopes,
      must_not: "execute_action",
      environment: shape.environment,
    },
    {
      id: `${shape.policy_label}:compatibility_reuse`,
      invariant: "compatibility_reuse",
      expect: shape.compatibility_impact,
      must_not: "infer_equivalence",
      environment: shape.environment,
    },
  ];
}
