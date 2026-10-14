// FILE: lib/protocol/proofFirst/index.ts

export { PROOF_FIRST_BUILD, TRUST_LIFECYCLE_AUDIT, TRUST_LIFECYCLE_STAGES } from "./trustBoundaries";
export {
  EVIDENCE_CUSTODY_POLICY_VERSION,
  EVIDENCE_CUSTODY_RULES,
  rulesRequiredForPartnerVerification,
} from "./evidenceCustodyBoundary";
export {
  HOLDER_POLICY_PRESENTATION_MEDIA_TYPE,
  HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION,
  composeHolderPolicyScopedPresentation,
  assertPresentationExcludesSensitiveCustody,
  type HolderPolicyScopedPresentation,
} from "./holderPolicyPresentation";
export {
  verifyHolderPresentationAtRelyingParty,
  type ProofFirstRelyingPartyConfig,
  type ProofFirstVerificationOutcome,
} from "./proofFirstRelyingParty";
