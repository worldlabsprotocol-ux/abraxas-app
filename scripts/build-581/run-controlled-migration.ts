#!/usr/bin/env npx tsx
// FILE: scripts/build-581/run-controlled-migration.ts
// Phase B Production DDL executor (manual founder invocation only).

import { executeControlledProductionMigrations } from "@/lib/passport/productionMigrationExecutor";
import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";

async function main() {
  const nonce = process.argv[2]?.trim();
  const dryRun = process.argv.includes("--dry-run");
  if (!nonce) {
    console.log(
      JSON.stringify(
        {
          build: 581,
          status: "blocked",
          detail: "Usage: run-controlled-migration.ts <execution_nonce> [--dry-run]",
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const result = await withAbraxasPgTransaction(async (client) =>
    executeControlledProductionMigrations({ client, executionNonce: nonce, dryRun }),
  );

  console.log(JSON.stringify({ build: 581, ...result }, null, 2));
  process.exit(result.ok ? 0 : 2);
}

main().catch((error) => {
  console.log(
    JSON.stringify(
      { build: 581, ok: false, code: "executor_crash", detail: error instanceof Error ? error.message : "failed" },
      null,
      2,
    ),
  );
  process.exit(2);
});
