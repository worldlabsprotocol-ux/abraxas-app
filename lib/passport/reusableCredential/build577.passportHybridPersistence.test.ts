// FILE: lib/passport/reusableCredential/build577.passportHybridPersistence.test.ts
// Proves Build #568 atomic authorization under supabase_postgrest + passport transaction pg.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { finalizeInstitutionalAuthorizationResourcesDirect } from "@/lib/persistence/passportInstitutionalAuthorizationAtomic";
import { insertInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import { insertPassportPossessionChallengeDirect } from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import { isPassportDirectPostgresEnabled } from "@/lib/persistence/env";
import { issuePassportPossessionChallenge } from "./holderPossessionChallenge";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

describe("Build #577 passport hybrid persistence (disposable PG)", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL", () => {});
    return;
  }

  beforeAll(() => {
    const dir = join(process.cwd(), "supabase/migrations");
    for (const file of SOVEREIGN_RUNTIME_SCHEMA_MANIFEST) {
      execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=0"], {
        input: readFileSync(join(dir, file), "utf8"),
        encoding: "utf8",
      });
    }
  });

  beforeEach(() => {
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role";
    process.env.ABRAXAS_PASSPORT_TRANSACTION_PG = "1";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    resetAbraxasPgPoolForTests();
    expect(isPassportDirectPostgresEnabled(process.env)).toBe(true);
  });

  it("consumes consent once under hybrid pg while PostgREST remains default transport", async () => {
    const holder = `subj_hybrid_${Date.now()}`;
    const credentialId = `cred_${Date.now()}`;
    const idempotencyKey = `idem_${Date.now()}`;
    const disclosureHash = "hash_a";

    const consentRow = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: holder,
      credentialId,
      partnerId: "partner_a",
      policyId: "policy_a",
      policyVersion: 1,
      disclosureHash,
    });
    expect(consentRow.ok).toBe(true);
    if (!consentRow.ok) return;

    const challenge = issuePassportPossessionChallenge({
      credentialId,
      partnerId: "partner_a",
      policyId: "policy_a",
    });
    await insertPassportPossessionChallengeDirect(challenge);

    const first = await finalizeInstitutionalAuthorizationResourcesDirect({
      idempotencyKey,
      holderSubjectId: holder,
      consentId: consentRow.consentId,
      challengeId: challenge.challenge_id,
      credentialId,
      partnerId: "partner_a",
      policyId: "policy_a",
      policyVersion: 1,
      disclosureHash,
      requestId: "req_1",
    });
    expect(first.ok).toBe(true);

    const second = await finalizeInstitutionalAuthorizationResourcesDirect({
      idempotencyKey: `${idempotencyKey}_other`,
      holderSubjectId: holder,
      consentId: consentRow.consentId,
      challengeId: challenge.challenge_id,
      credentialId,
      partnerId: "partner_a",
      policyId: "policy_a",
      policyVersion: 1,
      disclosureHash,
      requestId: "req_2",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe("consent_already_used");
    }
  });
});
