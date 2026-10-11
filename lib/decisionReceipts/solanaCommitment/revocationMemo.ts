// Observable revocation / supersession memos (Build #532) — digest-only, no PII.

import { createHash } from "node:crypto";

export const SOLANA_REVOCATION_MEMO_PROTOCOL = "abx-rvkt" as const;
export const SOLANA_REVOCATION_MEMO_VERSION = 1 as const;

export type RevocationMemoAction = "revoke" | "supersede";

export interface ParsedRevocationMemo {
  p: typeof SOLANA_REVOCATION_MEMO_PROTOCOL;
  v: typeof SOLANA_REVOCATION_MEMO_VERSION;
  /** Target receipt commitment digest (sha256 domain-separated), not receipt id. */
  t: string;
  a: RevocationMemoAction;
  /** Monotonic sequence for the same target digest (replay-safe ordering). */
  seq: number;
  /** Domain-separated event digest (no holder identifiers). */
  e: string;
}

const FORBIDDEN = ["@", "wallet", "birth", "biometric", "subject", "holder", "dr_", "0x"] as const;

export function buildRevocationEventDigest(input: {
  targetCommitmentDigest: string;
  action: RevocationMemoAction;
  sequence: number;
  policyCommitmentHash: string;
}): string {
  return createHash("sha256")
    .update(
      `${SOLANA_REVOCATION_MEMO_PROTOCOL}:event:${input.targetCommitmentDigest}:${input.action}:${input.sequence}:${input.policyCommitmentHash}`,
      "utf8",
    )
    .digest("hex");
}

export function buildRevocationMemo(input: {
  targetCommitmentDigest: string;
  action: RevocationMemoAction;
  sequence: number;
  policyCommitmentHash: string;
}): ParsedRevocationMemo {
  if (!/^[a-f0-9]{64}$/.test(input.targetCommitmentDigest)) throw new Error("invalid_target_digest");
  if (!/^[a-f0-9]{64}$/.test(input.policyCommitmentHash)) throw new Error("invalid_policy_commitment");
  if (!Number.isInteger(input.sequence) || input.sequence < 1) throw new Error("invalid_sequence");
  const memo = {
    p: SOLANA_REVOCATION_MEMO_PROTOCOL,
    v: SOLANA_REVOCATION_MEMO_VERSION,
    t: input.targetCommitmentDigest,
    a: input.action,
    seq: input.sequence,
    e: buildRevocationEventDigest(input),
  };
  return memo;
}

export function serializeRevocationMemo(memo: ParsedRevocationMemo): string {
  const json = JSON.stringify(memo);
  assertRevocationMemoPrivacySafe(json);
  return json;
}

export function parseRevocationMemo(raw: string): ParsedRevocationMemo | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ParsedRevocationMemo>;
    if (parsed.p !== SOLANA_REVOCATION_MEMO_PROTOCOL) return null;
    if (parsed.v !== SOLANA_REVOCATION_MEMO_VERSION) return null;
    if (typeof parsed.t !== "string" || !/^[a-f0-9]{64}$/.test(parsed.t)) return null;
    if (parsed.a !== "revoke" && parsed.a !== "supersede") return null;
    if (typeof parsed.seq !== "number" || parsed.seq < 1) return null;
    if (typeof parsed.e !== "string" || !/^[a-f0-9]{64}$/.test(parsed.e)) return null;
    assertRevocationMemoPrivacySafe(raw);
    return parsed as ParsedRevocationMemo;
  } catch {
    return null;
  }
}

export function assertRevocationMemoPrivacySafe(text: string): void {
  const lower = text.toLowerCase();
  for (const token of FORBIDDEN) {
    if (lower.includes(token)) throw new Error("revocation_memo_privacy_violation");
  }
  if (text.length > 256) throw new Error("revocation_memo_too_large");
}

export function verifyRevocationMemoFields(
  memo: ParsedRevocationMemo,
  input: { targetCommitmentDigest: string; policyCommitmentHash: string },
): boolean {
  if (memo.t !== input.targetCommitmentDigest) return false;
  const expected = buildRevocationEventDigest({
    targetCommitmentDigest: memo.t,
    action: memo.a,
    sequence: memo.seq,
    policyCommitmentHash: input.policyCommitmentHash,
  });
  return memo.e === expected;
}
