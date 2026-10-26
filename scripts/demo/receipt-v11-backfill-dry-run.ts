// FILE: scripts/demo/receipt-v11-backfill-dry-run.ts
// Read-only backfill classification (no writes). Full v1.1 sidecar logic: demoMigrationReadiness.test.ts

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function parseArgs(argv: string[]): { rowsPath: string; full: boolean } {
  let rowsPath = "scripts/demo/fixtures/demo-receipt-snapshot.json";
  let full = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--rows" && argv[i + 1]) {
      rowsPath = argv[i + 1];
      i += 1;
    }
    if (argv[i] === "--full") full = true;
  }
  return { rowsPath, full };
}

function quickClassify(rows: Record<string, unknown>[]) {
  const summary = { eligible: 0, already_final: 0, conflict: 0, reject: 0, rows: [] as unknown[] };
  for (const row of rows) {
    if (row.schema_version !== "1.1.0") {
      summary.reject += 1;
      summary.rows.push({ receipt_id: row.id, disposition: "reject", reasons: ["not_v11"] });
      continue;
    }
    summary.rows.push({
      receipt_id: row.id,
      disposition: "needs_full_planner",
      reasons: ["run_with_--full_or_vitest"],
    });
  }
  return summary;
}

async function main() {
  const { rowsPath, full } = parseArgs(process.argv.slice(2));
  const raw = readFileSync(rowsPath, "utf8");
  const rows = JSON.parse(raw) as Record<string, unknown>[];

  if (full || rows.some(r => r.schema_version === "1.1.0")) {
    execFileSync(
      "npx",
      ["vitest", "run", "lib/decisionReceipts/v1_1_0/demoMigrationReadiness.test.ts", "-t", "Demo snapshot backfill"],
      { stdio: "inherit", cwd: process.cwd() },
    );
    return;
  }

  const summary = quickClassify(rows);
  console.log(JSON.stringify({
    mode: "dry_run_quick",
    rows_source: rowsPath,
    row_count: rows.length,
    summary: {
      eligible: summary.eligible,
      already_final: summary.already_final,
      conflict: summary.conflict,
      reject: summary.reject,
    },
    sample_assessments: summary.rows.slice(0, 20),
    note: "Demo snapshot is v1.0.0-only; use --full when v1.1.0 rows are present.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
