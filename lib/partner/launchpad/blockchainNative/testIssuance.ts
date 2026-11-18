import {
  generateTestSigningKeyPair,
  type ReceiptSigningKeyPair,
} from "@/lib/decisionReceipts/signing";

/** Synthetic issuer keys for unit/ProgramTest pairing only — not used by the runtime adapter. */
export function blockchainNativeTestSigningKey(label: string): ReceiptSigningKeyPair {
  return generateTestSigningKeyPair(label);
}