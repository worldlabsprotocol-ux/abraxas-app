// FILE: lib/passport/reusableCredential/authenticatedClaims.ts

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import type { PartnerPolicyRules, RequiredClaimRule } from "@/lib/policy/types";
import { resolveStoredRequiredClaims } from "@/lib/policy/evaluatePolicy";
import type { SignedPassportReusableCredential } from "./contract";

export type AuthenticatedClaimFailure =
  | "missing_required_claim"
  | "ambiguous_outcome"
  | "outcome_policy_mismatch"
  | "unsupported_claim_type"
  | "expired_claim"
  | "inactive_claim";

export function materializeAuthenticatedClaimsForPolicy(input: {
  credential: SignedPassportReusableCredential;
  policyRules: PartnerPolicyRules;
  now?: Date;
}):
  | { ok: true; claims: CredentialClaimRecord[] }
  | { ok: false; code: AuthenticatedClaimFailure; claim_type?: string } {
  const now = input.now ?? new Date();
  const required = resolveStoredRequiredClaims(input.policyRules);
  const claims: CredentialClaimRecord[] = [];

  for (const rule of required) {
    const assertion = input.credential.payload.asserted_claims.find(
      (row) => row.claim_type === rule.claim_type,
    );
    if (!assertion) {
      return { ok: false, code: "missing_required_claim", claim_type: rule.claim_type };
    }
    if (!assertion.authenticated_outcome?.trim()) {
      return { ok: false, code: "ambiguous_outcome", claim_type: rule.claim_type };
    }
    if (rule.must_equal !== undefined && String(assertion.authenticated_outcome) !== String(rule.must_equal)) {
      return { ok: false, code: "outcome_policy_mismatch", claim_type: rule.claim_type };
    }
    if (assertion.authentication_method !== "issuer_signed_assertion") {
      return { ok: false, code: "unsupported_claim_type", claim_type: rule.claim_type };
    }
    const live = resolveClaimStatusAtRead({
      status: assertion.status === "active" ? "active" : assertion.status,
      expires_at: assertion.expires_at,
    });
    if (live !== "active") {
      return { ok: false, code: "inactive_claim", claim_type: rule.claim_type };
    }
    if (assertion.expires_at && Date.parse(assertion.expires_at) < now.getTime()) {
      return { ok: false, code: "expired_claim", claim_type: rule.claim_type };
    }
    claims.push(mapAssertionToClaimRecord(assertion, input.credential, rule));
  }

  return { ok: true, claims };
}

function mapAssertionToClaimRecord(
  assertion: SignedPassportReusableCredential["payload"]["asserted_claims"][number],
  credential: SignedPassportReusableCredential,
  rule: RequiredClaimRule,
): CredentialClaimRecord {
  return {
    id: assertion.claim_id,
    subject_id: credential.payload.holder_subject_id,
    credential_jti: credential.payload.credential_id,
    claim_type: assertion.claim_type as CredentialClaimRecord["claim_type"],
    claim_value: {
      outcome: assertion.authenticated_outcome,
      authentication_method: assertion.authentication_method,
    },
    issuer_id: assertion.issuer_id,
    assurance_level: assertion.assurance_level,
    issued_at: assertion.issued_at,
    expires_at: assertion.expires_at,
    status: "active",
    revocation_reference: null,
    evidence_reference: assertion.claim_evidence_ref,
    jurisdiction: null,
    policy_scope: rule.claim_type,
  };
}
