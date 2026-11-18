/** Local/reference only — not deployed to public Solana networks without founder approval. */
export const PROOF_CONTINUITY_PROGRAM_ID = "FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1";

export const PROOF_CONTINUITY_PREFIX = "ABRAXAS_PROOF_CONTINUITY_V1";

export const RECEIPT_COMMITMENT_STATUS = {
  active: 0,
  revoked: 1,
  expired: 2,
} as const;

export type ReceiptCommitmentStatusCode =
  (typeof RECEIPT_COMMITMENT_STATUS)[keyof typeof RECEIPT_COMMITMENT_STATUS];