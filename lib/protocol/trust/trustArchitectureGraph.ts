// Build #529 — protocol dependency graph (guarantee classification).

export type TrustGuaranteeClass =
  | "protocol_cryptography"
  | "abraxas_operated_infrastructure"
  | "blockchain_enforced"
  | "optional_internal_storage";

export type TrustArchitectureNode = {
  id: string;
  label: string;
  class: TrustGuaranteeClass;
  depends_on: string[];
  evidence_ref: string;
  db_only_risk: boolean;
};

export const TRUST_ARCHITECTURE_GRAPH_SCHEMA = "abraxas_trust_architecture_graph_v529" as const;

export function buildTrustArchitectureGraph(): {
  schema: typeof TRUST_ARCHITECTURE_GRAPH_SCHEMA;
  nodes: TrustArchitectureNode[];
  db_only_decisions: string[];
} {
  const nodes: TrustArchitectureNode[] = [
    {
      id: "receipt_ed25519_signature",
      label: "Decision receipt Ed25519 signature",
      class: "protocol_cryptography",
      depends_on: [],
      evidence_ref: "lib/decisionReceipts/signing.ts",
      db_only_risk: false,
    },
    {
      id: "continuous_validity",
      label: "Continuous validity / revocation / supersession",
      class: "protocol_cryptography",
      depends_on: ["receipt_ed25519_signature"],
      evidence_ref: "lib/decisionReceipts/validityResolver.ts",
      db_only_risk: false,
    },
    {
      id: "institutional_consume",
      label: "Institutional eligibility consume API",
      class: "abraxas_operated_infrastructure",
      depends_on: ["continuous_validity", "durable_replay"],
      evidence_ref: "lib/institutional/consumeInstitutionalEligibility.ts",
      db_only_risk: false,
    },
    {
      id: "durable_replay",
      label: "Durable replay nonce reservation (Postgres RPC)",
      class: "abraxas_operated_infrastructure",
      depends_on: [],
      evidence_ref: "lib/institutional/durableReplayNonceStore.ts",
      db_only_risk: true,
    },
    {
      id: "partner_api_auth",
      label: "Partner API key scope and tenant binding",
      class: "abraxas_operated_infrastructure",
      depends_on: [],
      evidence_ref: "lib/partner/partnerAuth.ts",
      db_only_risk: true,
    },
    {
      id: "policy_immutable_binding",
      label: "Immutable policy id/version binding at consume",
      class: "protocol_cryptography",
      depends_on: ["receipt_ed25519_signature"],
      evidence_ref: "lib/institutional/consumeInstitutionalEligibility.ts",
      db_only_risk: false,
    },
    {
      id: "solana_gate_program",
      label: "Solana eligibility gate program (devnet reference)",
      class: "blockchain_enforced",
      depends_on: [],
      evidence_ref: "lib/partner/chainAttestation/solanaGate.ts",
      db_only_risk: false,
    },
    {
      id: "solana_receipt_commitment",
      label: "Solana receipt batch/memo commitment (digest inclusion)",
      class: "blockchain_enforced",
      depends_on: ["receipt_ed25519_signature"],
      evidence_ref: "lib/decisionReceipts/solanaCommitment/contract.ts",
      db_only_risk: false,
    },
    {
      id: "chain_attestation_v2",
      label: "Chain eligibility attestation v2 (hashes only)",
      class: "blockchain_enforced",
      depends_on: ["solana_gate_program"],
      evidence_ref: "lib/partner/chainAttestation/contract.ts",
      db_only_risk: false,
    },
    {
      id: "supabase_persistence",
      label: "Supabase/Postgres operational persistence",
      class: "optional_internal_storage",
      depends_on: [],
      evidence_ref: "lib/protocol/trust/persistence/supabaseAdapters.ts",
      db_only_risk: true,
    },
    {
      id: "audit_events",
      label: "Audit telemetry persistence",
      class: "optional_internal_storage",
      depends_on: ["supabase_persistence"],
      evidence_ref: "lib/verification/audit.ts",
      db_only_risk: true,
    },
  ];

  const db_only_decisions = nodes.filter(n => n.db_only_risk).map(n => n.id);

  return { schema: TRUST_ARCHITECTURE_GRAPH_SCHEMA, nodes, db_only_decisions };
}
