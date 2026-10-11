#!/usr/bin/env npx tsx
/**
 * Apply migrations 139/140 only when gate reports apply_ready.
 * Never run in CI without explicit operator env.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateMigrationRehearsalGate, INSTITUTIONAL_REPLAY_MIGRATION_FILES } from "@/lib/institutional/sandbox/migrationRehearsalGate";

function main() {
  const gate = evaluateMigrationRehearsalGate({ dryRun: false });
  console.log(JSON.stringify(gate, null, 2));
  if (gate.mode !== "apply_ready" || gate.overall !== "PASS") {
    console.error("STOP: migration apply gate not ready");
    process.exit(gate.overall === "FAIL" ? 2 : 3);
  }

  const dbUrl = process.env.INSTITUTIONAL_SANDBOX_DATABASE_URL?.trim()
    || process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("STOP: database URL missing");
    process.exit(5);
  }

  for (const file of INSTITUTIONAL_REPLAY_MIGRATION_FILES) {
    const path = resolve(process.cwd(), "supabase/migrations", file);
    console.log(`Applying ${file}...`);
    execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-f", path, dbUrl], { stdio: "inherit" });
  }

  console.log("APPLY_COMPLETE — re-run privilege probe and preflight");
  process.exit(0);
}

main();
