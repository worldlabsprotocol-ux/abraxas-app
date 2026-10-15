// FILE: lib/passport/reusableCredential/holderPossessionChallengeSigning.ts
// Client-safe possession challenge signing (no Postgres or server-only imports).

import { createHash } from "crypto";
import nacl from "tweetnacl";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";

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

function challengeSigningPayload(record: PassportPossessionChallengePayload): PassportPossessionChallengePayload {
  return {
    v: record.v,
    purpose: record.purpose,
    challenge_id: record.challenge_id,
    credential_id: record.credential_id,
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    nonce: record.nonce,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
  };
}

function hashPossessionMessage(payload: PassportPossessionChallengePayload): Uint8Array {
  const digest = createHash("sha256")
    .update(canonicalizeJson(challengeSigningPayload(payload)), "utf8")
    .digest();
  return Uint8Array.from(digest);
}

export function signPassportPossessionChallenge(
  payload: PassportPossessionChallengePayload,
  holderSecretKey: Uint8Array,
): string {
  const message = hashPossessionMessage(payload);
  return Buffer.from(nacl.sign.detached(message, holderSecretKey)).toString("base64url");
}
