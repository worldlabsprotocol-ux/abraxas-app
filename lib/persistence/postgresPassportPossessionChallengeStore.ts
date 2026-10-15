// FILE: lib/persistence/postgresPassportPossessionChallengeStore.ts
import "server-only";

import type {
  PassportPossessionChallengePayload,
  PassportPossessionChallengeRecord,
  PassportPossessionChallengeStore,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { queryAbraxasPg } from "./pgPool";

export class PostgresPassportPossessionChallengeStore implements PassportPossessionChallengeStore {
  issue(input: Omit<PassportPossessionChallengePayload, "v" | "purpose">): PassportPossessionChallengePayload {
    const payload: PassportPossessionChallengePayload = {
      v: 1,
      purpose: "passport_reusable_credential_possession",
      ...input,
    };
    void queryAbraxasPg(
      `insert into public.passport_possession_challenges
       (challenge_id, credential_id, partner_id, policy_id, nonce, issued_at, expires_at, payload_json)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (challenge_id) do nothing`,
      [
        payload.challenge_id,
        payload.credential_id,
        payload.partner_id,
        payload.policy_id,
        payload.nonce,
        payload.issued_at,
        payload.expires_at,
        JSON.stringify(payload),
      ],
    );
    return payload;
  }

  get(challengeId: string): PassportPossessionChallengeRecord | null {
    throw new Error("PostgresPassportPossessionChallengeStore.get requires async; use getPassportPossessionChallengeRecordDirect");
  }

  consume(challengeId: string, at: string): { ok: true } | { ok: false; code: "unknown" | "expired" | "replay" } {
    throw new Error("PostgresPassportPossessionChallengeStore.consume requires async; use consumePassportPossessionChallengeDirect");
  }
}

export async function getPassportPossessionChallengeRecordDirect(
  challengeId: string,
): Promise<PassportPossessionChallengeRecord | null> {
  const { rows } = await queryAbraxasPg<{
    payload_json: PassportPossessionChallengePayload;
    consumed_at: string | null;
  }>(
    `select payload_json, consumed_at from public.passport_possession_challenges where challenge_id = $1`,
    [challengeId],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row.payload_json, consumed_at: row.consumed_at };
}

export async function insertPassportPossessionChallengeDirect(
  payload: PassportPossessionChallengePayload,
): Promise<void> {
  await queryAbraxasPg(
    `insert into public.passport_possession_challenges
     (challenge_id, credential_id, partner_id, policy_id, nonce, issued_at, expires_at, payload_json)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (challenge_id) do nothing`,
    [
      payload.challenge_id,
      payload.credential_id,
      payload.partner_id,
      payload.policy_id,
      payload.nonce,
      payload.issued_at,
      payload.expires_at,
      JSON.stringify(payload),
    ],
  );
}

export async function consumePassportPossessionChallengeDirect(input: {
  challengeId: string;
  credentialId: string;
  partnerId: string;
  policyId: string;
  at: string;
}): Promise<{ ok: true } | { ok: false; code: "unknown" | "expired" | "replay" }> {
  const existing = await getPassportPossessionChallengeRecordDirect(input.challengeId);
  if (!existing) return { ok: false, code: "unknown" };
  if (existing.consumed_at) return { ok: false, code: "replay" };
  if (Date.parse(existing.expires_at) < Date.parse(input.at)) return { ok: false, code: "expired" };
  if (
    existing.credential_id !== input.credentialId
    || existing.partner_id !== input.partnerId
    || existing.policy_id !== input.policyId
  ) {
    return { ok: false, code: "unknown" };
  }

  const { rows } = await queryAbraxasPg<{ challenge_id: string }>(
    `select challenge_id from public.consume_passport_possession_challenge($1,$2,$3,$4)`,
    [input.challengeId, input.credentialId, input.partnerId, input.policyId],
  );
  if (!rows[0]?.challenge_id) {
    return { ok: false, code: "replay" };
  }
  return { ok: true };
}
