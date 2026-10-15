#!/usr/bin/env npx tsx
// FILE: scripts/build-582/run-institutional-trust-proof.ts
// Reproducible two-tenant institutional trust proof via disposable PostgreSQL tests.

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const pgUrl = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim();

if (!pgUrl) {
  console.error(JSON.stringify({ ok: false, code: "disposable_pg_required" }, null, 2));
  process.exit(2);
}

try {
  execFileSync(
    join(process.cwd(), "node_modules/.bin/vitest"),
    [
      "run",
      "--no-file-parallelism",
      "lib/passport/build582.institutionalTrustProof.test.ts",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "inherit",
      env: process.env as NodeJS.ProcessEnv,
    },
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        build: 582,
        proof: "two_tenant_independent_verification",
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
