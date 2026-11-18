import { createHash } from "node:crypto";

/** Anchor account discriminator: first 8 bytes of sha256("account:{Name}"). */
export function anchorAccountDiscriminator(accountName: string): Buffer {
  return createHash("sha256").update(`account:${accountName}`).digest().subarray(0, 8);
}

export const RECEIPT_COMMITMENT_DISCRIMINATOR = anchorAccountDiscriminator("ReceiptCommitment");
export const PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR = anchorAccountDiscriminator("ProofContinuityRegistry");