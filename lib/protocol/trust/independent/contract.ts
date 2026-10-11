// Independent on-chain trust verification — public inputs only (Build #530).

import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";
import type { SolanaReceiptCommitmentRecord } from "@/lib/decisionReceipts/solanaCommitment/contract";
import type { MerkleInclusionProof } from "@/lib/protocol/trust/merkleInclusionProof";
import type { TrustDecisionEnvelope } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";

export const INDEPENDENT_TRUST_VERIFIER_SCHEMA = "abraxas_independent_trust_verifier_v530" as const;

export type ChainIdentity = {
  network_id: string;
  cluster: string;
  rpc_urls: string[];
  confirmation_threshold: "confirmed" | "finalized";
};

export type RevocationEvidence = {
  schema: "abraxas_revocation_evidence_v1";
  revoked: boolean;
  evidence_ref: string | null;
  superseded_by_receipt_id?: string | null;
};

export type SignedTrustDecisionBundle = {
  envelope: TrustDecisionEnvelope;
  receipt_payload: DecisionReceiptCanonicalPayload;
  receipt_signature: string;
};

export type IndependentTrustVerificationInput = {
  bundle: SignedTrustDecisionBundle;
  /** Public verification-key document (same shape as GET /api/receipts/verification-keys keys[]). */
  trust_registry_keys: ReceiptVerificationKeyRecord[];
  trust_registry_ref: string;
  immutable_policy_commitment_hash: string;
  inclusion_proof?: MerkleInclusionProof | null;
  /** Optional Abraxas-supplied commitment row — not authoritative without live chain observation. */
  commitment_hint?: SolanaReceiptCommitmentRecord | null;
  chain_identity?: ChainIdentity | null;
  revocation_evidence?: RevocationEvidence | null;
  /** Relying party identifier that must appear in envelope.relying_party_audience */
  relying_party_id: string;
  /** If Abraxas DB claims permit while chain denies — must still fail (adversarial). */
  abraxas_db_claims_permit?: boolean;
  now?: Date;
  /** When true (default for chain_required), missing RPC/tx/program evidence is blocked not pass. */
  require_live_chain_observation?: boolean;
};

export type VerificationPhase = "local_cryptographic" | "chain_observation";

export type IndependentTrustVerificationResult = {
  schema: typeof INDEPENDENT_TRUST_VERIFIER_SCHEMA;
  overall: "pass" | "fail" | "blocked" | "pending";
  phases: Record<
    VerificationPhase,
    {
      status: "pass" | "fail" | "blocked" | "pending" | "skipped";
      reasons: string[];
    }
  >;
  verified_properties: string[];
  evidence_sources: string[];
  chain_environment: string | null;
  blockers: string[];
  chain_assurance: {
    tier: TrustDecisionEnvelope["chain_assurance_tier"];
    finality: TrustDecisionEnvelope["chain_finality"];
  };
};
