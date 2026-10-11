// Which guarantees are authoritative on-chain vs off-chain (Build #529).

export const BLOCKCHAIN_TRUST_BOUNDARY_SCHEMA = "abraxas_blockchain_trust_boundary_v529" as const;

export type OnChainAuthoritativeState =
  | "approved_policy_commitment"
  | "authorized_protocol_issuer_signer"
  | "issuer_key_rotation_event"
  | "receipt_commitment_digest_inclusion"
  | "revocation_commitment"
  | "gate_program_upgrade_authority";

export type OffChainAuthoritativeState =
  | "qualified_evidence_artifacts"
  | "consent_disclosure_records"
  | "partner_api_credential_binding"
  | "replay_nonce_reservation"
  | "audit_event_correlation";

export type BlockchainTrustBoundarySpec = {
  schema: typeof BLOCKCHAIN_TRUST_BOUNDARY_SCHEMA;
  on_chain_authoritative: Array<{
    state: OnChainAuthoritativeState;
    reused_component: string;
    verification: string;
  }>;
  off_chain_authoritative: OffChainAuthoritativeState[];
  hybrid_requires_both: string[];
  outage_behavior: {
    chain_required_unavailable: "deny_or_pending_never_permit";
    chain_observed_unavailable: "off_chain_cryptographic_path_only";
    reorg_handling: "require_finalized_slot_or_confirmation_status_confirmed";
    emergency_controls: "governance_upgrade_authority_documented_off_chain";
  };
  no_on_chain_pii: true;
};

export function getBlockchainTrustBoundarySpec(): BlockchainTrustBoundarySpec {
  return {
    schema: BLOCKCHAIN_TRUST_BOUNDARY_SCHEMA,
    on_chain_authoritative: [
      {
        state: "approved_policy_commitment",
        reused_component: "Solana gate config PDA + policy hash in attestation message",
        verification: "lib/partner/chainAttestation/solanaMessage.ts",
      },
      {
        state: "authorized_protocol_issuer_signer",
        reused_component: "chain_attestation_signers registry + gate unknown_signer rejection",
        verification: "lib/partner/chainAttestation/signerLifecycle",
      },
      {
        state: "receipt_commitment_digest_inclusion",
        reused_component: "abx-rcpt memo commitment (batch digest, not per-request tx)",
        verification: "lib/decisionReceipts/solanaCommitment/verify.ts",
      },
      {
        state: "gate_program_upgrade_authority",
        reused_component: "LOCAL_SOLANA_GATE_PROGRAM_ID governance observation",
        verification: "lib/institutional/solanaMainnetGovernanceVerifier.ts",
      },
    ],
    off_chain_authoritative: [
      "qualified_evidence_artifacts",
      "consent_disclosure_records",
      "partner_api_credential_binding",
      "replay_nonce_reservation",
      "audit_event_correlation",
    ],
    hybrid_requires_both: [
      "Policies with solana receipt commitment requirement must pass Ed25519 receipt trust AND confirmed commitment digest",
    ],
    outage_behavior: {
      chain_required_unavailable: "deny_or_pending_never_permit",
      chain_observed_unavailable: "off_chain_cryptographic_path_only",
      reorg_handling: "require_finalized_slot_or_confirmation_status_confirmed",
      emergency_controls: "governance_upgrade_authority_documented_off_chain",
    },
    no_on_chain_pii: true,
  };
}
