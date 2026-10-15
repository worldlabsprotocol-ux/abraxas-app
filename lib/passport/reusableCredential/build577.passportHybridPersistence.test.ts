// FILE: lib/passport/reusableCredential/build577.passportHybridPersistence.test.ts
// Proves Build #568 atomic authorization under supabase_postgrest + passport transaction pg.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluateDisposablePgMigrationTestGuard } from "@/lib/persistence/disposablePgMigrationTestGuard";
import { DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV } from "@/lib/persistence/passportHybridPostgres";
import { queryAbraxasPg, resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { finalizeInstitutionalAuthorizationResourcesDirect } from "@/lib/persistence/passportInstitutionalAuthorizationAtomic";
import { insertInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import { insertPassportPossessionChallengeDirect } from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import { isPassportDirectPostgresEnabled } from "@/lib/persistence/env";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { issuePassportPossessionChallenge } from "./holderPossessionChallenge";

const guard = evaluateDisposablePgMigrationTestGuard(process.env);
const PG_URL = guard.ok ? guard.databaseUrl : undefined;

describe("Build #577 passport hybrid persistence (disposable PG)", () => {
  if (!PG_URL) {
    it.skip(
      guard.ok
        ? "disposable guard misconfigured"
        : `requires authorized disposable PG: ${guard.ok ? "" : guard.reason}`,
      () => {},
    );
    return;
  }

  const PASSPORT_MIGRATIONS = [
    "140_passport_reusable_credential_state.sql",
    "141_passport_institutional_presentation_consent.sql",
    "142_passport_institutional_authorization_commits.sql",
    "143_passport_authorization_signing_claim.sql",
  ] as const;

  const envSnapshot: NodeJS.ProcessEnv = { ...process.env };

  beforeEach(() => {
    const pgRef = supabaseProjectRefFromPostgresUrl(PG_URL);
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    if (pgRef) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${pgRef}.supabase.co`;
    } else {
      process.env[DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV] = "true";
    }
    process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role";
    process.env.ABRAXAS_PASSPORT_TRANSACTION_PG = "1";
    process.env.ABRAXAS_PASSPORT_DATABASE_URL = PG_URL;
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.DATABASE_URL;
    if (pgRef) {
      process.env.ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF = pgRef;
    }
    resetAbraxasPgPoolForTests();
    const dir = join(process.cwd(), "supabase/migrations");
    for (const file of PASSPORT_MIGRATIONS) {
      execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=1"], {
        input: readFileSync(join(dir, file), "utf8"),
        encoding: "utf8",
      });
    }
    expect(isPassportDirectPostgresEnabled(process.env)).toBe(true);
  });

  afterEach(() => {
    resetAbraxasPgPoolForTests();
  });

  afterAll(() => {
    process.env = envSnapshot;
    resetAbraxasPgPoolForTests();
  });

  it("consumes consent once under hybrid pg while PostgREST remains default transport", async () => {
    const probe = await queryAbraxasPg("select 1 as ok");
    expect(probe.rows[0]?.ok).toBe(1);
    const holder = `subj_hybrid_${Date.now()}`;
    const credentialId = `cred_${Date.now()}`;
    const idempotencyKey = `idem_${Date.now()}`;
    const disclosureHash = "a".repeat(64);

    const consentRow = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: holder,
      credentialId,
      partnerId: "partner_a",
      policyId: "policy_a",
      policyVersion: 1,
      disclosureHash,
    });
    if (!consentRow.ok) {
      throw new Error(`consent insert failed: ${consentRow.code}`);
    }

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
