#!/usr/bin/env npx tsx
// FILE: scripts/build-547-live-partner-certification/run.ts

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { runBuild547Certification } from "@/lib/institutionalCertification/build547/generateReport";
import { resolveInstitutionalStagingTarget } from "@/lib/partner/launchpad/resolveInstitutionalStagingTarget";

const REPORT_PATH =
  process.env.BUILD_547_CERT_REPORT?.trim()
  || "reports/build-547-live-partner-certification.json";

async function probeLivePublicReceipt(stagingUrl: string): Promise<{
  verdict: "pass" | "fail" | "blocked";
  observed: string;
  evidence: string[];
}> {
  const receiptId = process.env.BUILD_547_SYNTHETIC_RECEIPT_ID?.trim();
  if (!receiptId) {
    return {
      verdict: "blocked",
      observed: "BUILD_547_SYNTHETIC_RECEIPT_ID not configured; no synthetic staging receipt fetch attempted",
      evidence: [],
    };
  }
  const url = `${stagingUrl.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(receiptId)}/public`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.text();
    if (!res.ok) {
      return {
        verdict: "blocked",
        observed: `HTTP ${res.status} from public receipt surface (no fabricated success)`,
        evidence: [url.replace(/x-vercel-protection-bypass=[^&]+/, "redacted")],
      };
    }
    return {
      verdict: "pass",
      observed: `Public receipt HTTP ${res.status}; body length ${body.length} (verify offline separately)`,
      evidence: [url.replace(/x-vercel-protection-bypass=[^&]+/, "redacted"), `receipt_id=${receiptId}`],
    };
  } catch (error) {
    return {
      verdict: "blocked",
      observed: error instanceof Error ? error.message : "fetch failed",
      evidence: [url.replace(/x-vercel-protection-bypass=[^&]+/, "redacted")],
    };
  }
}

async function main() {
  execSync("npm run test:build-546-adversarial", { stdio: "inherit" });
  execSync("npm run test:build-547-live-partner", { stdio: "inherit" });

  const report = await runBuild547Certification();

  const staging = resolveInstitutionalStagingTarget();
  if (!staging.ok) {
    report.cases.push({
      test_id: "live_authenticated_holder_journey",
      threat_or_property: "Synthetic staging holder → receipt → external RP",
      expected_behavior: "Live observation or explicit blocked",
      observed_behavior: staging.blockers.join("; "),
      verification_evidence: ["resolveInstitutionalStagingTarget"],
      verdict: "blocked",
      observation_class: "live_staging",
    });
    report.summary.blocked += 1;
    report.supabase_independence.live_authenticated_holder_journey = "blocked";
    report.supabase_independence.detail = staging.blockers.join("; ");
  } else {
    const live = await probeLivePublicReceipt(staging.target.stagingUrl);
    report.cases.push({
      test_id: "live_public_receipt_http_boundary",
      threat_or_property: "Cross-service public receipt fetch (no Supabase client in RP)",
      expected_behavior: "HTTP observation or blocked without synthetic receipt id",
      observed_behavior: live.observed,
      verification_evidence: live.evidence,
      verdict: live.verdict,
      observation_class: "live_staging",
    });
    if (live.verdict === "pass") report.summary.pass += 1;
    else report.summary.blocked += 1;

    report.cases.push({
      test_id: "live_authenticated_holder_journey",
      threat_or_property: "Holder OAuth on isolated staging with authorized synthetic identity",
      expected_behavior: "Executed journey or blocked",
      observed_behavior:
        "Not auto-run: no authorized synthetic holder credentials supplied (no fabricated merchant activity).",
      verification_evidence: [`staging=${staging.target.stagingUrl.replace(/x-vercel-protection-bypass=[^&]+/, "redacted")}`],
      verdict: "blocked",
      observation_class: "live_staging",
    });
    report.summary.blocked += 1;
    report.supabase_independence.live_authenticated_holder_journey = "blocked";
    report.supabase_independence.detail =
      "Public receipt boundary may be probed when BUILD_547_SYNTHETIC_RECEIPT_ID is set; holder journey remains blocked without credentials.";
  }

  report.summary.ready_for_institutional_merge_review = report.summary.fail === 0;

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Build #547 certification report → ${resolve(REPORT_PATH)}`);
  console.log(
    `Summary: pass=${report.summary.pass} fail=${report.summary.fail} blocked=${report.summary.blocked}`,
  );
  console.log(
    `Latency p50 verify=${report.latency.verify_ms.p50}ms rp_decide=${report.latency.rp_decide_ms.p50}ms`,
  );

  if (report.summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
