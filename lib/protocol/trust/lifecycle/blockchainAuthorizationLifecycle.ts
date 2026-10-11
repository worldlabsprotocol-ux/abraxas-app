// Blockchain-required authorization lifecycle (Build #532).

export const BLOCKCHAIN_AUTHORIZATION_LIFECYCLE_SCHEMA = "abraxas_blockchain_authorization_lifecycle_v532" as const;

/** Authorization states — historical finality alone does not imply ACTIVE. */
export const AUTHORIZATION_LIFECYCLE_STATES = [
  "ISSUED",
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "SUPERSEDED",
] as const;
export type AuthorizationLifecycleState = (typeof AUTHORIZATION_LIFECYCLE_STATES)[number];

/** Verification outcomes — not authorization states. */
export const CONTINUOUS_VERIFICATION_OUTCOMES = [
  "PERMIT",
  "DENY",
  "PENDING",
  "UNAVAILABLE",
] as const;
export type ContinuousVerificationOutcome = (typeof CONTINUOUS_VERIFICATION_OUTCOMES)[number];

export const VERIFICATION_AUXILIARY_OUTCOMES = [
  "PENDING_FINALITY",
  "STATUS_UNAVAILABLE",
] as const;
export type VerificationAuxiliaryOutcome = (typeof VERIFICATION_AUXILIARY_OUTCOMES)[number];

export type LifecycleTransitionAuthority =
  | "policy_version_deprecation"
  | "issuer_key_revocation"
  | "credential_invalidation"
  | "holder_explicit_revocation"
  | "operator_revocation_control_plane"
  | "supersession_reissue"
  | "commitment_supersession_on_chain"
  | "on_chain_revocation_memo";

export type LifecycleTransitionRule = {
  from: AuthorizationLifecycleState | "ISSUED";
  to: AuthorizationLifecycleState;
  authority: LifecycleTransitionAuthority;
  requires_chain_evidence: boolean;
};

export function getBlockchainAuthorizationLifecycleSpec(): {
  schema: typeof BLOCKCHAIN_AUTHORIZATION_LIFECYCLE_SCHEMA;
  states: typeof AUTHORIZATION_LIFECYCLE_STATES;
  verification_outcomes: typeof CONTINUOUS_VERIFICATION_OUTCOMES;
  auxiliary_outcomes: typeof VERIFICATION_AUXILIARY_OUTCOMES;
  transitions: LifecycleTransitionRule[];
  invariants: string[];
} {
  return {
    schema: BLOCKCHAIN_AUTHORIZATION_LIFECYCLE_SCHEMA,
    states: AUTHORIZATION_LIFECYCLE_STATES,
    verification_outcomes: CONTINUOUS_VERIFICATION_OUTCOMES,
    auxiliary_outcomes: VERIFICATION_AUXILIARY_OUTCOMES,
    transitions: [
      { from: "ISSUED", to: "ACTIVE", authority: "commitment_supersession_on_chain", requires_chain_evidence: true },
      { from: "ACTIVE", to: "EXPIRED", authority: "policy_version_deprecation", requires_chain_evidence: false },
      { from: "ACTIVE", to: "REVOKED", authority: "on_chain_revocation_memo", requires_chain_evidence: true },
      { from: "ACTIVE", to: "REVOKED", authority: "holder_explicit_revocation", requires_chain_evidence: false },
      { from: "ACTIVE", to: "REVOKED", authority: "operator_revocation_control_plane", requires_chain_evidence: false },
      { from: "ACTIVE", to: "SUPERSEDED", authority: "supersession_reissue", requires_chain_evidence: false },
      { from: "ACTIVE", to: "SUPERSEDED", authority: "on_chain_revocation_memo", requires_chain_evidence: true },
      { from: "ISSUED", to: "REVOKED", authority: "issuer_key_revocation", requires_chain_evidence: false },
    ],
    invariants: [
      "Historical chain finality of a receipt commitment does not imply current ACTIVE authorization.",
      "Authoritative invalidation events after commitment finality downgrade verification to DENY.",
      "Newer on-chain invalidation (higher slot or sequence) overrides older commitment observations.",
      "PENDING_FINALITY and STATUS_UNAVAILABLE are verification outcomes, not authorization states.",
    ],
  };
}
