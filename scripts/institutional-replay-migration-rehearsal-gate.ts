#!/usr/bin/env npx tsx
/** Build #526 — guarded gate for migrations 139/140 (dry-run default). */

import { writeFileSync, mkdirSync } from "node:fs";
import { evaluateMigrationRehearsalGate } from "@/lib/institutional/sandbox/migrationRehearsalGate";

const OUT = "/opt/cursor/artifacts/institutional-replay-migration-gate.json";

function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const dryRun = process.env.INSTITUTIONAL_MIGRATION_DRY_RUN !== "0";
  const report = evaluateMigrationRehearsalGate({ dryRun });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUT}`);
  if (report.overall === "FAIL") process.exit(2);
  if (report.mode === "apply_blocked" && !dryRun) process.exit(4);
  if (report.overall === "BLOCKED" && !dryRun) process.exit(3);
  process.exit(0);
}

main();
