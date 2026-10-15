// FILE: lib/passport/reusableCredential/holderPossessionChallenge.ts

import { createHash, randomBytes } from "crypto";
import nacl from "tweetnacl";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";

export const PASSPORT_POSSESSION_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type PassportPossessionChallengePayload = {
  v: 1;
  purpose: "passport_reusable_credential_possession";
  challenge_id: string;
  credential_id: string;
  partner_id: string;
  policy_id: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
};

export type PassportPossessionChallengeRecord = PassportPossessionChallengePayload & {
  consumed_at: string | null;
};

export type HolderPossessionProof = {
  challenge_id: string;
  signature: string;
};

export interface PassportPossessionChallengeStore {
  issue(input: Omit<PassportPossessionChallengePayload, "v" | "purpose">): PassportPossessionChallengePayload;
  get(challengeId: string): PassportPossessionChallengeRecord | null;
  consume(challengeId: string, at: string): { ok: true } | { ok: false; code: "unknown" | "expired" | "replay" };
}

export class InMemoryPassportPossessionChallengeStore implements PassportPossessionChallengeStore {
  private readonly records = new Map<string, PassportPossessionChallengeRecord>();

  issue(input: Omit<PassportPossessionChallengePayload, "v" | "purpose">): PassportPossessionChallengePayload {
    const payload: PassportPossessionChallengePayload = {
      v: 1,
      purpose: "passport_reusable_credential_possession",
      ...input,
    };
    this.records.set(payload.challenge_id, { ...payload, consumed_at: null });
    return payload;
  }

  get(challengeId: string): PassportPossessionChallengeRecord | null {
    return this.records.get(challengeId) ?? null;
  }

  consume(challengeId: string, at: string): { ok: true } | { ok: false; code: "unknown" | "expired" | "replay" } {
    const row = this.records.get(challengeId);
    if (!row) return { ok: false, code: "unknown" };
    if (row.consumed_at) return { ok: false, code: "replay" };
    if (Date.parse(row.expires_at) < Date.parse(at)) return { ok: false, code: "expired" };
    row.consumed_at = at;
    this.records.set(challengeId, row);
    return { ok: true };
  }

  clearForTests(): void {
    this.records.clear();
  }
}

let defaultChallengeStore: InMemoryPassportPossessionChallengeStore | null = null;

export function getPassportPossessionChallengeStore(): InMemoryPassportPossessionChallengeStore {
  if (!defaultChallengeStore) defaultChallengeStore = new InMemoryPassportPossessionChallengeStore();
  return defaultChallengeStore;
}

export function resetPassportPossessionChallengeStoreForTests(): void {
  defaultChallengeStore?.clearForTests();
}

export function issuePassportPossessionChallenge(input: {
  credentialId: string;
  partnerId: string;
  policyId: string;
  now?: Date;
  store?: PassportPossessionChallengeStore;
}): PassportPossessionChallengePayload {
  const now = input.now ?? new Date();
  const store = input.store ?? getPassportPossessionChallengeStore();
  return store.issue({
    challenge_id: `poss_${randomBytes(10).toString("base64url")}`,
    credential_id: input.credentialId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    nonce: randomBytes(16).toString("base64url"),
    issued_at: now.toISOString(),
    expires_at: new Date(now.getTime() + PASSPORT_POSSESSION_CHALLENGE_TTL_MS).toISOString(),
  });
}

function hashPossessionMessage(payload: PassportPossessionChallengePayload): Uint8Array {
  const digest = createHash("sha256").update(canonicalizeJson(payload), "utf8").digest();
  return Uint8Array.from(digest);
}

export function signPassportPossessionChallenge(
  payload: PassportPossessionChallengePayload,
  holderSecretKey: Uint8Array,
): string {
  const message = hashPossessionMessage(payload);
  return Buffer.from(nacl.sign.detached(message, holderSecretKey)).toString("base64url");
}

export function verifyPassportPossessionProof(input: {
  credentialId: string;
  partnerId: string;
  policyId: string;
  credentialHolderPublicKey: string;
  challenge: PassportPossessionChallengePayload;
  proof: HolderPossessionProof;
  now?: Date;
  store?: PassportPossessionChallengeStore;
}): { ok: true } | { ok: false; code: string } {
  const now = input.now ?? new Date();
  const store = input.store ?? getPassportPossessionChallengeStore();
  if (input.proof.challenge_id !== input.challenge.challenge_id) {
    return { ok: false, code: "challenge_id_mismatch" };
  }
  if (input.challenge.credential_id !== input.credentialId) {
    return { ok: false, code: "credential_mismatch" };
  }
  if (input.challenge.partner_id !== input.partnerId) {
    return { ok: false, code: "partner_mismatch" };
  }
  if (input.challenge.policy_id !== input.policyId) {
    return { ok: false, code: "policy_mismatch" };
  }
  const consumed = store.consume(input.challenge.challenge_id, now.toISOString());
  if (!consumed.ok) {
    return { ok: false, code: `challenge_${consumed.code}` };
  }
  if (Date.parse(input.challenge.expires_at) < now.getTime()) {
    return { ok: false, code: "challenge_expired" };
  }
  try {
    const pub = Uint8Array.from(Buffer.from(input.credentialHolderPublicKey, "base64url"));
    const sig = Uint8Array.from(Buffer.from(input.proof.signature, "base64url"));
    const message = hashPossessionMessage(input.challenge);
    if (!nacl.sign.detached.verify(message, sig, pub)) {
      return { ok: false, code: "possession_signature_invalid" };
    }
  } catch {
    return { ok: false, code: "possession_signature_invalid" };
  }
  return { ok: true };
}
