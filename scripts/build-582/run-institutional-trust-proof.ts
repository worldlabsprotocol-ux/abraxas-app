#!/usr/bin/env npx tsx
// FILE: scripts/build-582/run-institutional-trust-proof.ts
// Reproducible two-tenant institutional trust proof via disposable PostgreSQL tests.

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  build582TrustProofGuardEnv,
  evaluateBuild582DisposableTrustProofBootstrap,
} from "@/lib/passport/build582/disposableTrustProofDatabase";

const guardEnv = build582TrustProofGuardEnv(process.env);
const bootstrap = evaluateBuild582DisposableTrustProofBootstrap(guardEnv);

if (!bootstrap.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "disposable_guard_failed",
        reason: bootstrap.reason,
        note: "Set ABRAXAS_SOVEREIGN_ENV_CLASS=disposable, ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID=abraxas_sovereign_disposable, ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED=true, and ABRAXAS_DISPOSABLE_PG_TEST_URL to an authorized disposable cluster URL. Never use Production project bztwutzprwsdrtqdpymf.",
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

try {
  execFileSync(
    join(process.cwd(), "node_modules/.bin/vitest"),
    [
      "run",
      "--no-file-parallelism",
      "lib/passport/build582.disposableTrustProofGuard.test.ts",
      "lib/passport/build582.institutionalTrustProof.test.ts",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "inherit",
      env: {
        ...process.env,
        ...guardEnv,
      } as NodeJS.ProcessEnv,
    },
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        build: 582,
        proof: "two_tenant_independent_verification",
        database_identity: bootstrap.databaseIdentity,
        guard: bootstrap.guardReason,
        synthetic_sandbox_only: true,
        production_personal_data: false,
      },
      null,
      2,
    ),
  );
} catch {
  process.exit(1);
}
