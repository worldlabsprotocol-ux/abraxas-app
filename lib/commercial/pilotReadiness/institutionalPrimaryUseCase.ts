// FILE: lib/commercial/pilotReadiness/institutionalPrimaryUseCase.ts
// Build 875 — articulate commercial value from existing protocol capabilities (no invented demand).

export type InstitutionalBuyerRole =
  | "platform_operator"
  | "compliance_risk"
  | "integration_engineering"
  | "procurement";

export type InstitutionalPrimaryUseCase = {
  id: string;
  headline: string;
  problemStatement: string;
  institutionalBuyer: InstitutionalBuyerRole[];
  integrationOwner: InstitutionalBuyerRole[];
  measurableValue: string[];
  existingCapabilities: string[];
  notGenericVerificationApi: string;
};

/** Highest-value institutional action supported today without new product surface. */
export const PRIMARY_INSTITUTIONAL_USE_CASE: InstitutionalPrimaryUseCase = {
  id: "policy_bound_independent_trust_decision",
  headline: "Independently verifiable, policy-bound trust decisions",
  problemStatement:
    "Platforms must gate access or transactions on trust outcomes (wallet control, eligibility, freshness) without re-collecting identity on every visit or trusting Abraxas as the sole verifier.",
  institutionalBuyer: ["platform_operator", "compliance_risk", "procurement"],
  integrationOwner: ["integration_engineering"],
  measurableValue: [
    "Reduce repeat identity collection when holder evidence remains valid and consented",
    "Fail-closed enforcement in the integrator using portable receipts + pinned trust anchor",
    "Audit trail via signed decision receipt and status evidence (not Abraxas dashboard alone)",
    "Repeat verification volume attributable via PII-free metering (approved receipts, API calls)",
  ],
  existingCapabilities: [
    "Policy-bound trust decisions (Integration Studio + partner policy binding)",
    "Wallet-native authorization (wallet_control and related qualification paths)",
    "Signed verification receipts (partner flow complete → decision receipt)",
    "Independent relying-party verification (@abraxas/independent-verifier / external-node-partner)",
    "Evidence freshness and revocation (signed status statement; Build 870 non-authorizing stale issuer)",
    "Reusable verification without unnecessary identity collection (consent + portable export)",
  ],
  notGenericVerificationApi:
    "Abraxas sells policy-bound, independently verifiable trust outcomes — not a hosted yes/no API. The integrator verifies and enforces; Abraxas issues evidence the institution can audit.",
};

export function describeInstitutionalPrimaryUseCase(): InstitutionalPrimaryUseCase {
  return PRIMARY_INSTITUTIONAL_USE_CASE;
}
