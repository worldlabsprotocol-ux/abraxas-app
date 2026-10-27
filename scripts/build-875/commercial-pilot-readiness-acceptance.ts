#!/usr/bin/env npx tsx
// FILE: scripts/build-875/commercial-pilot-readiness-acceptance.ts

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditMeteringAndCostFindings,
  buildPricingHypotheses,
  commercialValidationGates,
  commercialValidationMilestones,
  describeFirstPaidPilotOffer,
  describeInstitutionalPrimaryUseCase,
  sampleCommercialEstimateForPilotVolume,
  summarizeCommercialValidation,
} from "../../lib/commercial/pilotReadiness";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-875";

function main(): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const report = {
    build: 875,
    ok: true,
    generated_at: new Date().toISOString(),
    agent_git_sha: agentGitSha,
    commercial_validation_claimed: false,
    commercial_readiness_score_change: false,
    primary_use_case: describeInstitutionalPrimaryUseCase(),
    first_paid_pilot: describeFirstPaidPilotOffer(),
    pricing_hypotheses: buildPricingHypotheses(),
    sample_estimate_pilot_10k_receipts: sampleCommercialEstimateForPilotVolume({
      approvedReceipts: 10_000,
      authenticatedApiCalls: 250_000,
      planId: "launch",
    }),
    metering_and_cost: auditMeteringAndCostFindings(),
    validation_gates: commercialValidationGates(),
    validation_milestones: commercialValidationMilestones(),
    validation_summary: summarizeCommercialValidation(),
    interview_doc: "docs/commercial/WILLINGNESS_TO_PAY_INTERVIEW_v1.md",
    operations_doc: "docs/operations/BUILD_875_INSTITUTIONAL_PILOT_COMMERCIAL_VALIDATION.md",
  };

  const outPath = join(ARTIFACT_DIR, "commercial-pilot-readiness.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, artifact: outPath, commercial_validation_claimed: false }, null, 2));
}

main();
