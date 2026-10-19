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
    commit_sha: string;
    status: {
      session_independent_verification_demonstrated: boolean;
      fail_closed_integrity_verified: boolean;
    };
    execution: { receipt_id?: string; decision?: string };
    independent_verification: {
      server_record_integrity_verified: boolean;
      standalone_cryptographic_verification: boolean;
    };
    negative_cases: Array<{ case_id: string; verdict: string }>;
  };

  const failed = report.negative_cases.filter((c) => c.verdict !== "pass");
  if (
    !report.status.session_independent_verification_demonstrated
    || !report.status.fail_closed_integrity_verified
    || failed.length > 0
  ) {
    console.error(`Build 762 report incomplete: ${outPath}`);
    if (failed.length) {
      console.error("Failed negative cases:", failed.map((c) => c.case_id).join(", "));
    }
    process.exit(1);
  }
  console.log(`Build 762 institutional trust report: ${outPath}`);
  console.log(`receipt_id=${report.execution.receipt_id}`);
  console.log(`decision=${report.execution.decision}`);
  console.log(`commit_sha=${report.commit_sha}`);
  console.log(
    `session_independent server_record_integrity_verified=${report.independent_verification.server_record_integrity_verified}`,
  );
  console.log(
    `standalone_cryptographic_verification=${report.independent_verification.standalone_cryptographic_verification}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
