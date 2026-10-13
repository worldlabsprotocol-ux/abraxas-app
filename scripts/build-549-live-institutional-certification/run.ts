#!/usr/bin/env npx tsx
// FILE: scripts/build-549-live-institutional-certification/run.ts

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { runBuild549Certification } from "@/lib/institutionalCertification/build549/generateReport";

const REPORT_PATH =
  process.env.BUILD_549_CERT_REPORT?.trim()
  || "reports/build-549-live-institutional-certification.json";

async function main() {
  execSync("npm run test:build-546-adversarial", { stdio: "inherit" });
  execSync("npm run test:build-547-live-partner", { stdio: "inherit" });
  execSync("npm run test:build-548-distributed-replay", { stdio: "inherit" });

  const report = await runBuild549Certification();

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Build #549 certification report → ${resolve(REPORT_PATH)}`);
  console.log(
    `Summary: pass=${report.summary.pass} fail=${report.summary.fail} blocked=${report.summary.blocked}`,
  );
  console.log(`Live institutional: ${report.summary.live_institutional_certification}`);
  console.log(`Staging deploy commit: ${report.environment.deployed_commit_sha_prefix ?? "unknown"}`);
  console.log(`Agent commit: ${report.commit_sha.slice(0, 7)}`);

  if (report.summary.fail > 0) process.exit(1);
  if (report.summary.live_institutional_certification === "blocked") process.exit(2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
