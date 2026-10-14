import { randomBytes } from "node:crypto";
import { describe, expect, it, beforeAll, beforeEach, afterEach } from "vitest";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWallet } from "@/lib/auth/holderSubject/service";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { resetAbraxasPgPoolForTests } from "./pgPool";
import { resetPersistenceClientForTests } from "./admin";
import { resetChainNeutralSchemaCacheForTests } from "./chainNeutralSchemaReady";
import { resolvePersistenceConfig, persistenceUsesDirectPostgres } from "./env";
import { storeEncryptedEvidence, readEncryptedEvidence } from "./evidenceBlobStore";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

const SOVEREIGN_ENV: Record<string, string> = {
  ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
  ABRAXAS_DATABASE_URL: PG_URL ?? "",
  ABRAXAS_EVIDENCE_STORAGE_ROOT: "",
  ABRAXAS_EVIDENCE_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
};

describe("Build #553 sovereign runtime — adversarial", () => {
  it("postgres_direct requires database URL", () => {
    const cfg = resolvePersistenceConfig({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    });
    expect(cfg.ok).toBe(false);
  });

  it("receipt independent verifier runs without Supabase env", () => {
    const result = verifyReceiptIndependently({
      publicReceipt: {
        artifact_type: "eligibility_decision_receipt",
        receipt_id: "r-test",
        partner_id: "p",
        policy_id: "pol",
        decision: "deny",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        currently_valid: false,
        signature_valid: false,
      } as never,
      expectations: { partnerId: "p", policyId: "pol" },
      env: {},
    });
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.checks_possible_offline.length).toBeGreaterThan(0);
  });

  it("encrypted evidence round-trip is independent of Supabase", () => {
    const dir = mkdtempSync(join(tmpdir(), "abraxas-evidence-test-"));
    try {
      const env = {
        ...SOVEREIGN_ENV,
        ABRAXAS_EVIDENCE_STORAGE_ROOT: dir,
      };
      const plain = Buffer.from("identity-evidence-simulation");
      const stored = storeEncryptedEvidence({
        holderSubjectId: "abx_hs_aabbccddeeff00112233445566778899",
        captureSessionId: `cap_${randomBytes(4).toString("hex")}`,
        plaintext: plain,
        env,
      });
      const dec = readEncryptedEvidence({ storagePath: stored.storagePath, env });
      expect(dec.equals(plain)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Build #553 sovereign runtime — disposable PostgreSQL proof", () => {
  if (!PG_URL) {
    it.skip("requires ABRAXAS_SOVEREIGN_PG_URL or MIGRATION_136_PG_URL", () => {});
    return;
  }

  beforeAll(() => {
    if (!PG_URL) return;
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/136_passport_holder_subjects.sql"),
      "utf8",
    );
    execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=0"], { input: sql, encoding: "utf8" });
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

  it("creates holder subject and binds wallet without PostgREST", async () => {
    expect(persistenceUsesDirectPostgres()).toBe(true);
    const addr = `0x${randomBytes(20).toString("hex")}`;
    const caip = caip10Evm(11155111, addr);
    const first = await resolveSubjectForVerifiedWallet({
      caip,
      authMethod: "evm_wallet",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.created).toBe(true);

    const second = await resolveSubjectForVerifiedWallet({
      caip,
      authMethod: "evm_wallet",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.created).toBe(false);
    expect(second.subjectId).toBe(first.subjectId);
  });

  it("rejects binding the same wallet to a different subject", async () => {
    const caip = caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`);
    const a = await resolveSubjectForVerifiedWallet({ caip, authMethod: "evm_wallet" });
    expect(a.ok).toBe(true);
    if (!a.ok) return;

    const { bindVerifiedWalletAccount } = await import("@/lib/auth/holderSubject/service");
    const other = `abx_hs_${"b".repeat(32)}`;
    const { insertHolderSubject } = await import("@/lib/auth/holderSubject/service");
    await insertHolderSubject(other);
    const conflict = await bindVerifiedWalletAccount({
      subjectId: other,
      caip,
      authMethod: "evm_wallet",
    });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.code).toBe("wallet_bound_to_other_subject");
  });
});
