#!/usr/bin/env npx tsx
// FILE: scripts/build-548-distributed-replay/run.ts

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { runBuild548Certification } from "@/lib/institutionalCertification/build548/generateReport";

const REPORT_PATH =
  process.env.BUILD_548_CERT_REPORT?.trim()
  || "reports/build-548-distributed-replay-certification.json";

async function main() {
  execSync("npm run test:build-546-adversarial", { stdio: "inherit" });
  execSync("npm run test:build-547-live-partner", { stdio: "inherit" });
  execSync("npm run test:build-548-distributed-replay", { stdio: "inherit" });

  const report = await runBuild548Certification();

  report.cases.push({
    test_id: "live_authenticated_holder_journey",
    threat_or_property: "Live holder → receipt → distributed RP",
    expected_behavior: "Blocked without authorized synthetic credentials",
    observed_behavior:
      "Not executed — live holder certification remains blocked; local adapters are not live evidence.",
    verification_evidence: [],
    verdict: "blocked",
    observation_class: "live_staging",
  });
  report.summary.blocked += 1;

  report.summary.ready_for_institutional_merge_review = report.summary.fail === 0;

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Build #548 certification report → ${resolve(REPORT_PATH)}`);
  console.log(
    `Summary: pass=${report.summary.pass} fail=${report.summary.fail} blocked=${report.summary.blocked}`,
  );
  console.log(`Audit atomicity (postgres): ${report.audit_atomicity.postgres_verdict}`);
  console.log(
    `Latency p50 rp_decide (postgres)=${report.latency.rp_decide_postgres_ms.p50}ms`,
  );

  if (report.summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
