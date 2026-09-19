// FILE: lib/settlement/circle/eligibleReceiptSelection.ts
// Encrypted, session- and app-bound selection tokens. Never a public receipt id.

import { createHash, randomUUID } from "crypto";
import { CompactEncrypt, compactDecrypt } from "jose";
import { CIRCLE_PUBLIC_CODES, type CirclePublicCode } from "@/lib/settlement/circle/codes";

const MAX_AGE_SEC = 10 * 60;
const ALLOWED = new Set([
  "receiptId",
  "partnerId",
  "applicationId",
  "policyId",
  "policyVersion",
  "sessionKeyId",
  "jti",
  "exp",
  "iat",
]);

const consumedJti = new Map<string, number>();

function encryptionKey(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

function pruneConsumed(now = Date.now()): void {
  for (const [jti, exp] of consumedJti.entries()) {
    if (exp <= now) consumedJti.delete(jti);
  }
}

export function resetEligibleReceiptSelectionReplayForTests(): void {
  consumedJti.clear();
}

export type EligibleReceiptSelection = {
  receiptId: string;
  partnerId: string;
  applicationId: string;
  policyId: string;
  policyVersion: number;
  sessionKeyId: string;
  jti: string;
  expMs: number;
};

export async function signEligibleReceiptSelection(
  input: Omit<EligibleReceiptSelection, "jti" | "expMs"> & { jti?: string },
  now = Date.now(),
): Promise<string | null> {
  const key = encryptionKey();
  if (!key) return null;
  const jti = input.jti?.trim() || randomUUID();
  const exp = Math.floor(now / 1000) + MAX_AGE_SEC;
  const iat = Math.floor(now / 1000);
  const payload = JSON.stringify({
    receiptId: input.receiptId.trim(),
    partnerId: input.partnerId.trim(),
    applicationId: input.applicationId.trim(),
    policyId: input.policyId.trim(),
    policyVersion: input.policyVersion,
    sessionKeyId: input.sessionKeyId.trim(),
    jti,
    exp,
    iat,
  });
  return new CompactEncrypt(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key);
}

export async function verifyEligibleReceiptSelection(
  token: string,
  expected: {
    partnerId: string;
    applicationId: string;
    policyId: string;
    policyVersion: number;
    sessionKeyId: string;
  },
  now = Date.now(),
): Promise<{ ok: true; selection: EligibleReceiptSelection } | { ok: false; code: CirclePublicCode }> {
  const key = encryptionKey();
  if (!key || !token.trim()) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_invalid };
  }
  pruneConsumed(now);
  let parsed: Record<string, unknown>;
  try {
    const { plaintext } = await compactDecrypt(token.trim(), key);
    parsed = JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>;
  } catch {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_invalid };
  }
  const extra = Object.keys(parsed).filter((k) => !ALLOWED.has(k));
  if (extra.length > 0) return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_invalid };

  const exp = typeof parsed.exp === "number" ? parsed.exp : 0;
  if (exp * 1000 <= now) return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_expired };

  const selection: EligibleReceiptSelection = {
    receiptId: typeof parsed.receiptId === "string" ? parsed.receiptId.trim() : "",
    partnerId: typeof parsed.partnerId === "string" ? parsed.partnerId.trim() : "",
    applicationId: typeof parsed.applicationId === "string" ? parsed.applicationId.trim() : "",
    policyId: typeof parsed.policyId === "string" ? parsed.policyId.trim() : "",
    policyVersion: typeof parsed.policyVersion === "number" ? parsed.policyVersion : NaN,
    sessionKeyId: typeof parsed.sessionKeyId === "string" ? parsed.sessionKeyId.trim() : "",
    jti: typeof parsed.jti === "string" ? parsed.jti.trim() : "",
    expMs: exp * 1000,
  };
  if (
    !selection.receiptId
    || !selection.partnerId
    || !selection.applicationId
    || !selection.policyId
    || !selection.sessionKeyId
    || !selection.jti
    || !Number.isInteger(selection.policyVersion)
  ) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_invalid };
  }
  if (
    selection.partnerId !== expected.partnerId.trim()
    || selection.applicationId !== expected.applicationId.trim()
    || selection.sessionKeyId !== expected.sessionKeyId.trim()
  ) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant };
  }
  if (
    selection.policyId !== expected.policyId.trim()
    || selection.policyVersion !== expected.policyVersion
  ) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version };
  }
  if (consumedJti.has(selection.jti)) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.selection_replay };
  }
  return { ok: true, selection };
}

export function consumeEligibleReceiptSelection(jti: string, expMs: number): void {
  consumedJti.set(jti, expMs);
}
