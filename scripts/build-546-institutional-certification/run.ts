#!/usr/bin/env npx tsx
// FILE: scripts/build-546-institutional-certification/run.ts

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { runBuild546LocalCertification } from "@/lib/institutionalCertification/build546/generateReport";
import { resolveInstitutionalStagingTarget } from "@/lib/partner/launchpad/resolveInstitutionalStagingTarget";

const REPORT_PATH =
  process.env.BUILD_546_CERT_REPORT?.trim()
  || "reports/build-546-institutional-certification.json";

async function main() {
  execSync("npm run test:build-546-adversarial", { stdio: "inherit" });

  const report = runBuild546LocalCertification();

  const staging = resolveInstitutionalStagingTarget();
  if (!staging.ok) {
    report.cases.push({
      test_id: "live_staging_holder_integration",
      threat_or_property: "Authenticated external relying party on isolated staging",
      expected_behavior: "Live observation or explicit blocked with reason",
      observed_behavior: staging.blockers.join("; "),
      verification_evidence: ["resolveInstitutionalStagingTarget"],
      verdict: "blocked",
      observation_class: "live_staging",
    });
    report.summary.blocked += 1;
    report.supabase_independence.live_staging_holder_flow = "blocked";
    report.supabase_independence.detail = staging.blockers.join("; ");
  } else {
    report.cases.push({
      test_id: "live_staging_target_resolved",
      threat_or_property: "Staging URL and demo Supabase ref configured",
      expected_behavior: "Target resolved without production ref",
      observed_behavior: staging.target.stagingUrl.replace(/x-vercel-protection-bypass=[^&]+/, "redacted"),
      verification_evidence: [`expected_supabase_ref=${staging.target.expectedSupabaseRef}`],
      verdict: "pass",
      observation_class: "live_staging",
    });
    report.summary.pass += 1;
    report.supabase_independence.live_staging_holder_flow = "blocked";
    report.supabase_independence.detail =
      "Staging target resolves in this environment; holder OAuth journey not auto-run (no fabricated partner activity).";
  }

  report.summary.ready_for_institutional_merge_review = report.summary.fail === 0;

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Build #546 certification report → ${resolve(REPORT_PATH)}`);
  console.log(
    `Summary: pass=${report.summary.pass} fail=${report.summary.fail} blocked=${report.summary.blocked}`,
  );

  if (report.summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
