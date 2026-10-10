import {
  SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION,
  SOLANA_RECEIPT_COMMITMENT_PROTOCOL,
} from "@/lib/decisionReceipts/solanaCommitment/contract";

export interface ReceiptCommitmentMemo {
  p: typeof SOLANA_RECEIPT_COMMITMENT_PROTOCOL;
  v: typeof SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION;
  d: string;
  rid: string;
}

const FORBIDDEN_MEMO_SUBSTRINGS = [
  "@",
  "wallet",
  "sui",
  "0x",
  "dob",
  "birth",
  "document",
  "biometric",
  "subject_id",
  "holder",
] as const;

export function buildReceiptCommitmentMemo(input: {
  commitmentDigest: string;
  receiptId: string;
}): ReceiptCommitmentMemo {
  if (!/^[a-f0-9]{64}$/.test(input.commitmentDigest)) throw new Error("invalid_digest");
  if (!/^dr_[A-Za-z0-9_-]+$/.test(input.receiptId)) throw new Error("invalid_receipt_id");
  return {
    p: SOLANA_RECEIPT_COMMITMENT_PROTOCOL,
    v: SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION,
    d: input.commitmentDigest,
    rid: input.receiptId,
  };
}

export function serializeReceiptCommitmentMemo(memo: ReceiptCommitmentMemo): string {
  const json = JSON.stringify(memo);
  assertMemoPrivacySafe(json);
  return json;
}

export function parseReceiptCommitmentMemo(raw: string): ReceiptCommitmentMemo | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ReceiptCommitmentMemo>;
    if (parsed.p !== SOLANA_RECEIPT_COMMITMENT_PROTOCOL) return null;
    if (parsed.v !== SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION) return null;
    if (typeof parsed.d !== "string" || !/^[a-f0-9]{64}$/.test(parsed.d)) return null;
    if (typeof parsed.rid !== "string" || !/^dr_[A-Za-z0-9_-]+$/.test(parsed.rid)) return null;
    assertMemoPrivacySafe(raw);
    return parsed as ReceiptCommitmentMemo;
  } catch {
    return null;
  }
}

export function assertMemoPrivacySafe(text: string): void {
  const lower = text.toLowerCase();
  for (const token of FORBIDDEN_MEMO_SUBSTRINGS) {
    if (lower.includes(token)) throw new Error("memo_privacy_violation");
  }
  if (text.length > 256) throw new Error("memo_too_large");
}
