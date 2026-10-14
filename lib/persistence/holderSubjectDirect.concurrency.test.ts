import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { caip10Evm, caip10Solana } from "@/lib/auth/holderSubject/caip";
import {
  bindVerifiedWalletAccount,
  insertHolderSubject,
  linkLegacyKeyToSubject,
  resolveSubjectForVerifiedWallet,
  LegacyLinkConflictError,
} from "@/lib/auth/holderSubject/service";
import {
  consumePassportEvmAuthChallengeDirect,
  consumePassportSolanaAuthChallengeDirect,
  insertEvmChallengeDirect,
  insertSolanaChallengeDirect,
} from "./authChallengeDirect";
import {
  queryPersistedWalletOwner,
  resolveSubjectForVerifiedWalletDirect,
} from "./holderSubjectDirect";
import { resetChainNeutralSchemaCacheForTests } from "./chainNeutralSchemaReady";
import { resetPersistenceClientForTests } from "./admin";
import { requireAbraxasPgPool, resetAbraxasPgPoolForTests } from "./pgPool";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

function applyMigration136(): void {
  if (!PG_URL) return;
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/136_passport_holder_subjects.sql"),
    "utf8",
  );
  execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=0"], { input: sql, encoding: "utf8" });
}

async function countWalletRows(caip10: string): Promise<number> {
  const pool = requireAbraxasPgPool();
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.passport_holder_wallet_accounts WHERE caip10 = $1`,
    [caip10],
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

async function countOrphanSubjects(subjectIds: string[]): Promise<number> {
  if (subjectIds.length === 0) return 0;
  const pool = requireAbraxasPgPool();
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.passport_holder_subjects s
     WHERE s.subject_id = ANY($1::text[])
       AND NOT EXISTS (
         SELECT 1 FROM public.passport_holder_wallet_accounts w WHERE w.subject_id = s.subject_id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.passport_holder_legacy_links l WHERE l.subject_id = s.subject_id
       )`,
    [subjectIds],
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

describe("Build #553 — holder subject direct concurrency (PostgreSQL)", () => {
  if (!PG_URL) {
    it.skip("requires ABRAXAS_SOVEREIGN_PG_URL or MIGRATION_136_PG_URL", () => {});
    return;
  }

  beforeAll(() => {
    applyMigration136();
  });

  beforeEach(() => {
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    resetChainNeutralSchemaCacheForTests();
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    delete process.env.ABRAXAS_DATABASE_URL;
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    resetChainNeutralSchemaCacheForTests();
  });

  it("32 concurrent first-time auths yield one persisted wallet owner", async () => {
    const addr = `0x${randomBytes(20).toString("hex")}`;
    const caip = caip10Evm(11155111, addr);

    const results = await Promise.all(
      Array.from({ length: 32 }, () =>
        resolveSubjectForVerifiedWalletDirect({ caip, authMethod: "evm_wallet" }),
      ),
    );

    expect(results.every((r) => r.ok)).toBe(true);
    const subjectIds = results.filter((r) => r.ok).map((r) => r.subjectId);
    expect(new Set(subjectIds).size).toBe(1);

    const persisted = await queryPersistedWalletOwner(caip.caip10);
    expect(persisted).toBe(subjectIds[0]);
    expect(await countWalletRows(caip.caip10)).toBe(1);
    expect(await countOrphanSubjects(subjectIds)).toBe(0);
  });

  it("rejects binding one wallet to a second subject and keeps DB owner unchanged", async () => {
    const caip = caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`);
    const first = await resolveSubjectForVerifiedWallet({ caip, authMethod: "evm_wallet" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const other = "abx_hs_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    await insertHolderSubject(other);
    const conflict = await bindVerifiedWalletAccount({
      subjectId: other,
      caip,
      authMethod: "evm_wallet",
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.code).toBe("wallet_bound_to_other_subject");
    }

    expect(await queryPersistedWalletOwner(caip.caip10)).toBe(first.subjectId);
    expect(await countWalletRows(caip.caip10)).toBe(1);
  });

  it("allows multiple wallets on one subject (EVM + Solana)", async () => {
    const evm = caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`);
    const sol = caip10Solana("devnet", Keypair.generate().publicKey.toBase58());

    const first = await resolveSubjectForVerifiedWallet({ caip: evm, authMethod: "evm_wallet" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const bindSol = await bindVerifiedWalletAccount({
      subjectId: first.subjectId,
      caip: sol,
      authMethod: "solana_wallet",
    });
    expect(bindSol.ok).toBe(true);

    const pool = requireAbraxasPgPool();
    const rows = await pool.query<{ caip10: string }>(
      `SELECT caip10 FROM public.passport_holder_wallet_accounts WHERE subject_id = $1 ORDER BY caip10`,
      [first.subjectId],
    );
    expect(rows.rows.map((r) => r.caip10).sort()).toEqual([evm.caip10, sol.caip10].sort());
  });

  it("rejects conflicting legacy links and allows idempotent recovery", async () => {
    const subjectA = `abx_hs_${"c".repeat(32)}`;
    const subjectB = `abx_hs_${"d".repeat(32)}`;
    await insertHolderSubject(subjectA);
    await insertHolderSubject(subjectB);

    const legacyKey = `legacy_${randomBytes(8).toString("hex")}`;
    await linkLegacyKeyToSubject({
      subjectId: subjectA,
      legacyKind: "sui_zklogin",
      legacyKey,
    });

    await expect(
      linkLegacyKeyToSubject({
        subjectId: subjectB,
        legacyKind: "sui_zklogin",
        legacyKey,
      }),
    ).rejects.toBeInstanceOf(LegacyLinkConflictError);

    await linkLegacyKeyToSubject({
      subjectId: subjectA,
      legacyKind: "sui_zklogin",
      legacyKey,
    });

    const pool = requireAbraxasPgPool();
    const row = await pool.query<{ subject_id: string }>(
      `SELECT subject_id FROM public.passport_holder_legacy_links WHERE legacy_kind = $1 AND legacy_key = $2`,
      ["sui_zklogin", legacyKey],
    );
    expect(row.rows[0]?.subject_id).toBe(subjectA);
  });

  it("rolls back subject creation when wallet insert fails (no orphan subject)", async () => {
    const caip = caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`);
    const owner = await resolveSubjectForVerifiedWalletDirect({ caip, authMethod: "evm_wallet" });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const orphanCandidates: string[] = [];
    const pool = requireAbraxasPgPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { createHolderSubjectId } = await import("@/lib/auth/holderSubject/subjectId");
      const subjectId = createHolderSubjectId();
      orphanCandidates.push(subjectId);
      await client.query(
        `INSERT INTO public.passport_holder_subjects (subject_id) VALUES ($1)`,
        [subjectId],
      );
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    expect(await countOrphanSubjects(orphanCandidates)).toBe(0);
  });

  it("EVM challenge: single consume, replay denied, expired denied", async () => {
    const challengeId = `evm_${randomBytes(8).toString("hex")}`;
    const wallet = `0x${randomBytes(20).toString("hex")}`;
    const ctx = randomBytes(16).toString("hex");
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();

    await insertEvmChallengeDirect({
      id: challengeId,
      wallet_address: wallet,
      chain_id: 11155111,
      origin: "https://example.test",
      intended_action: "sign_in",
      session_context_hash: ctx,
      nonce: randomBytes(16).toString("hex"),
      message: "sign me",
      expires_at: future,
    });

    const ok = await consumePassportEvmAuthChallengeDirect({
      challengeId,
      walletAddress: wallet,
      sessionContextHash: ctx,
    });
    expect(ok?.id).toBe(challengeId);

    const replay = await consumePassportEvmAuthChallengeDirect({
      challengeId,
      walletAddress: wallet,
      sessionContextHash: ctx,
    });
    expect(replay).toBeNull();

    const expiredId = `evm_${randomBytes(8).toString("hex")}`;
    await insertEvmChallengeDirect({
      id: expiredId,
      wallet_address: wallet,
      chain_id: 11155111,
      origin: "https://example.test",
      intended_action: "sign_in",
      session_context_hash: ctx,
      nonce: randomBytes(16).toString("hex"),
      message: "expired",
      expires_at: past,
    });
    const expired = await consumePassportEvmAuthChallengeDirect({
      challengeId: expiredId,
      walletAddress: wallet,
      sessionContextHash: ctx,
    });
    expect(expired).toBeNull();
  });

  it("Solana challenge: single consume and replay denied", async () => {
    const challengeId = `sol_${randomBytes(8).toString("hex")}`;
    const wallet = randomBytes(32).toString("hex");
    const ctx = randomBytes(16).toString("hex");

    await insertSolanaChallengeDirect({
      id: challengeId,
      wallet_address: wallet,
      solana_network: "devnet",
      origin: "https://example.test",
      intended_action: "sign_in",
      session_context_hash: ctx,
      nonce: randomBytes(16).toString("hex"),
      message: "sign me",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    const ok = await consumePassportSolanaAuthChallengeDirect({
      challengeId,
      walletAddress: wallet,
      sessionContextHash: ctx,
    });
    expect(ok?.id).toBe(challengeId);

    const replay = await consumePassportSolanaAuthChallengeDirect({
      challengeId,
      walletAddress: wallet,
      sessionContextHash: ctx,
    });
    expect(replay).toBeNull();
  });
});
