// FILE: lib/custody/token2022Evaluation.ts
// Solana Token-2022 feasibility analysis — decision documented in code.

export const TOKEN2022_IMPLEMENTATION_STATUS = "not_implemented" as const;

export const TOKEN2022_DECISION = {
  implemented: false,
  mandatory: false,
  adapterOptional: true,
  summary:
    "Token-2022 is not implemented. A signed off-chain credential plus optional hash commitment "
    + "achieves the same verification outcome with less transferability, correlation, and chain dependency.",
} as const;

export const TOKEN2022_EVALUATION = {
  questions: {
    needs_token: {
      answer: false,
      rationale: "Eligibility is a policy-bound signed receipt, not a tradable asset.",
    },
    signed_credential_sufficient: {
      answer: true,
      rationale: "Existing credential_claims + decision_receipts already provide issuer-signed reusable facts.",
    },
    unwanted_transferability: {
      answer: true,
      risk: "Token-2022 mints create transfer/delegation surfaces even with non-transferable extensions.",
    },
    non_transferability_enforced: {
      answer: "partial",
      rationale: "Non-transferable extensions exist but wallet binding still correlates on-chain.",
    },
    public_metadata_correlation: {
      answer: true,
      risk: "Mint metadata and wallet ownership become durable public linkage.",
    },
    revocation_model: {
      answer: "off_chain_preferred",
      rationale: "Revocation registry or live receipt validity check is simpler than on-chain burn semantics.",
    },
    expiration_model: {
      answer: "receipt_ttl",
      rationale: "expires_at on signed receipts and claim TTL already enforce freshness.",
    },
    wallet_as_identity: {
      answer: true,
      risk: "Wallet address must not become global holder identifier for all partners.",
    },
    solana_dependency: {
      answer: true,
      risk: "Mandatory Token-2022 would couple core verification to Solana.",
    },
    chain_neutral_core: {
      answer: true,
      rationale: "Core semantics remain in DecisionReceiptCanonicalPayload v1.0.0 and claim contracts.",
    },
  },
  preferredAlternative: "registry_commitment_model" as const,
  preferredAlternativeDescription:
    "Holder-controlled credential (off-chain) → optional commitment anchor (hash-only) → "
    + "status registry (active/revoked/expired) → Abraxas signed receipt → partner verifies receipt/status.",
} as const;

export function token2022RequiredForVerification(): boolean {
  return false;
}
