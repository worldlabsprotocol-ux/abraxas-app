#!/usr/bin/env npx tsx
// FILE: scripts/build-876/institutional-pilot-activation-acceptance.ts

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  emptyExternalDeveloperMetrics,
  EXTERNAL_DEVELOPER_HANDOFF_MINIMUM,
} from "../../lib/commercial/pilotActivation";
import {
  auditPilotEconomicsReadiness,
  emptyPilotEconomicsObservations,
} from "../../lib/commercial/pilotEconomics/costAttributionModel";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-876";

function main(): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const report = {
    build: 876,
    ok: true,
    generated_at: new Date().toISOString(),
    agent_git_sha: agentGitSha,
    scorecard: {
      adoption_score_change: false,
      commercial_score_change: false,
      security_score_change: false,
    },
    pilot_focus: "policy_bound_independent_enforcement",
    activation_kit: "docs/integration/external-developer/PILOT_ACTIVATION_KIT.md",
    handoff_minimum: [...EXTERNAL_DEVELOPER_HANDOFF_MINIMUM],
    external_developer_adoption: emptyExternalDeveloperMetrics(),
    automated_reference_only: {
      command: "BUILD873_DEMO_LIVE_ADOPTION=1 npm run build873:demo-external-node-live-adoption",
      counts_as_unaided_adoption: false,
    },
    commercial_discovery: {
      intro_interview: "docs/commercial/WILLINGNESS_TO_PAY_INTERVIEW_INTRO_v1.md",
      research_bank: "docs/commercial/WILLINGNESS_TO_PAY_RESEARCH_BANK_v1.md",
      validation_in_repo: false,
    },
    pilot_economics: {
      observations: emptyPilotEconomicsObservations(),
      readiness: auditPilotEconomicsReadiness(),
    },
    security_dependencies: [
      "Build 870 mandatory freshness on enforce",
      "Build 874 evidence tier deployed_demo for production recovery claims",
      "Launchpad production review unchanged",
    ],
    remaining_blockers: [
      "No unaided external developer metrics recorded",
      "No institutional WTP/pilot commitment in repo (by design)",
      "Marginal verification COGS not observed — operator billing attribution required",
      "Build 874 deployed recovery drills incomplete",
    ],
  };

  const outPath = join(ARTIFACT_DIR, "institutional-pilot-activation.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, artifact: outPath }, null, 2));
}

main();
