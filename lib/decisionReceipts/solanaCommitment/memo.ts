import {
  SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION,
  SOLANA_RECEIPT_COMMITMENT_PROTOCOL,
} from "@/lib/decisionReceipts/solanaCommitment/contract";

/** On-chain memo (v2): digest + protocol marker only — no receipt id. */
export interface ReceiptCommitmentMemoV2 {
  p: typeof SOLANA_RECEIPT_COMMITMENT_PROTOCOL;
  v: 1 | 2;
  d: string;
}

/** Legacy v1 memos may include rid; still parsed for verification of older devnet txs. */
export interface ReceiptCommitmentMemoV1 extends ReceiptCommitmentMemoV2 {
  rid?: string;
}

export type ParsedReceiptCommitmentMemo = ReceiptCommitmentMemoV2 & { rid?: string };

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
  "dr_",
] as const;

export function buildReceiptCommitmentMemo(input: {
  commitmentDigest: string;
}): ReceiptCommitmentMemoV2 {
  if (!/^[a-f0-9]{64}$/.test(input.commitmentDigest)) throw new Error("invalid_digest");
  return {
    p: SOLANA_RECEIPT_COMMITMENT_PROTOCOL,
    v: SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION,
    d: input.commitmentDigest,
  };
}

export function serializeReceiptCommitmentMemo(memo: ReceiptCommitmentMemoV2): string {
  const json = JSON.stringify(memo);
  assertMemoPrivacySafe(json);
  return json;
}

export function parseReceiptCommitmentMemo(raw: string): ParsedReceiptCommitmentMemo | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ParsedReceiptCommitmentMemo>;
    if (parsed.p !== SOLANA_RECEIPT_COMMITMENT_PROTOCOL) return null;
    if (parsed.v !== 1 && parsed.v !== 2) return null;
    if (typeof parsed.d !== "string" || !/^[a-f0-9]{64}$/.test(parsed.d)) return null;
    if (parsed.rid != null && typeof parsed.rid !== "string") return null;
    if (parsed.v === 1) {
      if (typeof parsed.rid !== "string" || !/^dr_[A-Za-z0-9_-]+$/.test(parsed.rid)) return null;
    }
    if (parsed.v === 2 && parsed.rid != null) return null;
    assertMemoPrivacySafe(raw, { allowLegacyReceiptId: parsed.v === 1 });
    return parsed as ParsedReceiptCommitmentMemo;
  } catch {
    return null;
  }
}

export function assertMemoPrivacySafe(
  text: string,
  opts?: { allowLegacyReceiptId?: boolean },
): void {
  const lower = text.toLowerCase();
  for (const token of FORBIDDEN_MEMO_SUBSTRINGS) {
    if (opts?.allowLegacyReceiptId && token === "dr_") continue;
    if (lower.includes(token)) throw new Error("memo_privacy_violation");
  }
  if (text.length > 128) throw new Error("memo_too_large");
}
