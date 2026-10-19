#!/usr/bin/env npx tsx
// FILE: scripts/build-762-institutional-trust-transaction/run.ts

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const REPORT_PATH =
  process.env.BUILD_762_REPORT?.trim()
  || "reports/build-762-institutional-trust-transaction.json";

async function main() {
  execSync("BUILD_762_WRITE_REPORT=1 npm run test:build-762-institutional-trust", {
    stdio: "inherit",
    env: { ...process.env, BUILD_762_WRITE_REPORT: "1" },
  });

  const outPath = resolve(process.cwd(), REPORT_PATH);
  const raw = await readFile(outPath, "utf8");
  const report = JSON.parse(raw) as {
    status: { cryptographically_tested: boolean };
    execution: { receipt_id?: string; decision?: string };
    independent_verification: { signature_authentic: boolean };
    negative_cases: Array<{ case_id: string; verdict: string }>;
  };

  const failed = report.negative_cases.filter((c) => c.verdict !== "pass");
  if (!report.status.cryptographically_tested || failed.length > 0) {
    console.error(`Build 762 report incomplete: ${outPath}`);
    if (failed.length) {
      console.error("Failed negative cases:", failed.map((c) => c.case_id).join(", "));
    }
    process.exit(1);
  }
  console.log(`Build 762 institutional trust report: ${outPath}`);
  console.log(`receipt_id=${report.execution.receipt_id}`);
  console.log(`decision=${report.execution.decision}`);
  console.log(`independent signature_authentic=${report.independent_verification.signature_authentic}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
