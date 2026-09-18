// FILE: lib/policy/changeControl/fixture.ts
// Offline/simulated draft evaluation. Never issues receipts and never returns PII.

import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicy, PartnerPolicyRules, PolicyEvaluationResult } from "@/lib/policy/types";
import { evaluatePolicyVersionGate } from "@/lib/policy/changeControl/issuance";
import { POLICY_WITHHELD_FIELDS } from "@/lib/policy/changeControl/compare";

export const POLICY_FIXTURE_LABEL = "offline_simulated" as const;

export interface PolicyFixtureClaimInput {
  claim_type: string;
  assurance_level?: "L0" | "L1" | "L2" | "L3" | "L4";
  present?: boolean;
}

export interface PolicyFixtureResult {
  classification: typeof POLICY_FIXTURE_LABEL;
  label: "Offline / simulated — this does not issue a production receipt.";
  decision: PolicyEvaluationResult["decision"];
  reason_codes: string[];
  missing_claims: string[];
  production_usable: false;
  issues_receipt: false;
  withheld_fields: string[];
  gate_code: string | null;
}

const FORBIDDEN_FIXTURE_KEYS = [
  "email",
  "date_of_birth",
  "dob",
  "legal_name",
  "document",
  "passport",
  "selfie",
  "wallet",
  "id_token",
  "oauth",
  "secret",
  "jwt",
];

export function fixtureInputContainsForbiddenKeys(input: unknown): boolean {
  const blob = JSON.stringify(input ?? {}).toLowerCase();
  return FORBIDDEN_FIXTURE_KEYS.some((key) => blob.includes(key));
}

function syntheticClaim(input: PolicyFixtureClaimInput): CredentialClaimRecord {
  return {
    id: `fixture-${input.claim_type}`,
    subject_id: "fixture-subject",
    credential_jti: "fixture-jti",
    claim_type: input.claim_type as CredentialClaimRecord["claim_type"],
    claim_value: { fixture: true, met: true },
    issuer_id: "issuer:abraxas-sandbox",
    assurance_level: input.assurance_level ?? "L2",
    issued_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    jurisdiction: null,
    revocation_reference: null,
    evidence_reference: null,
    policy_scope: null,
  };
}

export function evaluatePolicyFixture(input: {
  policy: PartnerPolicy;
  partnerId: string;
  claims?: PolicyFixtureClaimInput[];
}): PolicyFixtureResult {
  const gate = evaluatePolicyVersionGate({
    policy: input.policy,
    partnerId: input.partnerId,
    expectedVersion: input.policy.version,
    mode: "fixture_simulate",
  });

  const rules: PartnerPolicyRules = input.policy.rules_json ?? {};
  const claims = (input.claims ?? [])
    .filter((claim) => claim.present !== false)
    .map(syntheticClaim);

  const evaluation = evaluatePolicyRules(rules, claims, {
    partnerId: input.partnerId,
    policyId: input.policy.id,
  });

  return {
    classification: POLICY_FIXTURE_LABEL,
    label: "Offline / simulated — this does not issue a production receipt.",
    decision: evaluation.decision,
    reason_codes: evaluation.reason_codes,
    missing_claims: evaluation.missing_claims,
    production_usable: false,
    issues_receipt: false,
    withheld_fields: [...POLICY_WITHHELD_FIELDS],
    gate_code: gate.ok ? null : gate.code,
  };
}
