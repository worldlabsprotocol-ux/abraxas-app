import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";

export const SOLANA_NATIVE_RECEIPT_COMMITMENT_POLICIES = [
  CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID,
  GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
] as const;

export function isSolanaNativeReceiptCommitmentPolicy(policyId: string): boolean {
  return (SOLANA_NATIVE_RECEIPT_COMMITMENT_POLICIES as readonly string[]).includes(policyId);
}

export function policyRequiresSolanaReceiptCommitment(policyId: string): boolean {
  return isSolanaNativeReceiptCommitmentPolicy(policyId);
}
