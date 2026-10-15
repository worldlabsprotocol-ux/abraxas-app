import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetPassportPossessionChallengeStoreForTests } from "./holderPossessionChallenge";
import nacl from "tweetnacl";
import { queryAbraxasPg, resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { randomBytes } from "node:crypto";
import {
  PASSPORT_POSSESSION_CHALLENGE_TTL_MS,
  signPassportPossessionChallenge,
  verifyPassportPossessionProofAsync,
  type PassportPossessionChallengeStore,
} from "./holderPossessionChallenge";
import {
  consumePassportPossessionChallengeDirect,
  getPassportPossessionChallengeRecordDirect,
  insertPassportPossessionChallengeDirect,
} from "@/lib/persistence/postgresPassportPossessionChallengeStore";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

describe.sequential("Build #567 durable possession challenge consumption", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL", () => {});
    return;
  }

  const pgOnlyChallengeStore: PassportPossessionChallengeStore = {
    issue: () => {
      throw new Error("pg_only_store");
    },
    get: () => null,
    consume: () => ({ ok: false, code: "unknown" }),
  };

  function issueDurableChallenge(input: {
    credentialId: string;
    partnerId: string;
    policyId: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    return {
      v: 1 as const,
      purpose: "passport_reusable_credential_possession" as const,
      challenge_id: `poss_${randomBytes(10).toString("base64url")}`,
      credential_id: input.credentialId,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      nonce: randomBytes(16).toString("base64url"),
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + PASSPORT_POSSESSION_CHALLENGE_TTL_MS).toISOString(),
    };
  }

  beforeEach(async () => {
    resetPassportPossessionChallengeStoreForTests();
    await queryAbraxasPg(
      `delete from public.passport_possession_challenges where credential_id in ($1, $2)`,
      ["pc_dur_test", "pc_dur_replay"],
    );
  });

  beforeAll(() => {
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    resetAbraxasPgPoolForTests();
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/140_passport_reusable_credential_state.sql"),
      "utf8",
    );
    execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
  });

  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 41)));

  it("rejects consumption before a valid holder signature", async () => {
    const now = new Date();
    const challenge = issueDurableChallenge({
      credentialId: "pc_dur_test",
      partnerId: "partner-a",
      policyId: "policy-a",
      now,
    });
    await insertPassportPossessionChallengeDirect(challenge);

    const badProof = { challenge_id: challenge.challenge_id, signature: "AAAA" };
    const verify = await verifyPassportPossessionProofAsync({
      credentialId: challenge.credential_id,
      partnerId: challenge.partner_id,
      policyId: challenge.policy_id,
      credentialHolderPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url"),
      challenge,
      proof: badProof,
      now,
      store: pgOnlyChallengeStore,
      durableConsume: (id, at) =>
        consumePassportPossessionChallengeDirect({
          challengeId: id,
          credentialId: challenge.credential_id,
          partnerId: challenge.partner_id,
          policyId: challenge.policy_id,
          at,
        }),
    });
    expect(verify.ok).toBe(false);
  });

  it("consumes only once under sequential replay attempts", async () => {
    const now = new Date();
    const challenge = issueDurableChallenge({
      credentialId: "pc_dur_replay",
      partnerId: "partner-b",
      policyId: "policy-b",
      now,
    });
    await insertPassportPossessionChallengeDirect(challenge);
    const loaded = await getPassportPossessionChallengeRecordDirect(challenge.challenge_id);
    expect(loaded).toBeTruthy();
    expect(loaded!.consumed_at).toBeNull();
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
    };
    const ok = await verifyPassportPossessionProofAsync({
      credentialId: challenge.credential_id,
      partnerId: challenge.partner_id,
      policyId: challenge.policy_id,
      credentialHolderPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url"),
      challenge,
      proof,
      now,
      store: pgOnlyChallengeStore,
      durableConsume: (id, at) =>
        consumePassportPossessionChallengeDirect({
          challengeId: id,
          credentialId: challenge.credential_id,
          partnerId: challenge.partner_id,
          policyId: challenge.policy_id,
          at,
        }),
    });
    expect(ok.ok).toBe(true);

    const replay = await consumePassportPossessionChallengeDirect({
      challengeId: challenge.challenge_id,
      credentialId: challenge.credential_id,
      partnerId: challenge.partner_id,
      policyId: challenge.policy_id,
      at: now.toISOString(),
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.code).toBe("replay");
  });
});
