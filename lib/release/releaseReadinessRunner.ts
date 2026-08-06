// FILE: lib/release/releaseReadinessRunner.ts
// Read-only release readiness aggregation — no Supabase or production mutations.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveIatAutomatedOptions } from "@/lib/iat/iatAutomatedConfig";
import {
  defaultIatAutomatedDeps,
  runIatAutomated,
} from "@/lib/iat/iatAutomatedRunner";
import { runIntegrationPreflight } from "@/lib/integration/preflight";
import { resolvePreflightOptions } from "@/lib/integration/preflightConfig";
import type { PreflightDeps } from "@/lib/integration/preflightTypes";
import { assessWalkthroughEvidence } from "@/lib/release/parseWalkthroughEvidence";
import type {
  ReleaseReadinessCheck,
  ReleaseReadinessOptions,
  ReleaseReadinessResult,
  ReleaseReadinessSection,
  ReleaseReadinessStatus,
  ReleaseReadinessSummary,
} from "@/lib/release/releaseReadinessTypes";

const REGRESSION_CMD =
  "npm test -- lib/protocol/compatibility.test.ts lib/decisionReceipts/validityResolver.test.ts lib/partner/partnerFlowAudit.test.ts lib/partner/partnerFlowRoutes.test.ts lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts";

function check(
  id: string,
  section: ReleaseReadinessSection,
  label: string,
  status: ReleaseReadinessStatus,
  evidence: string,
): ReleaseReadinessCheck {
  return { id, section, label, status, evidence };
}

function summarize(checks: ReleaseReadinessCheck[]): ReleaseReadinessSummary {
  const summary: ReleaseReadinessSummary = {
    pass: 0,
    fail: 0,
    pending: 0,
    human_required: 0,
    blocked: 0,
  };
  for (const c of checks) {
    summary[c.status] += 1;
  }
  return summary;
}

function groupBySection(
  checks: ReleaseReadinessCheck[],
): Record<ReleaseReadinessSection, ReleaseReadinessCheck[]> {
  const sections: Record<ReleaseReadinessSection, ReleaseReadinessCheck[]> = {
    implemented_and_deployed: [],
    iat_evidence_recorded: [],
    human_evidence_required: [],
    security_review_pending: [],
    second_partner_pilot_pending: [],
    beta_tag_pending: [],
  };
  for (const c of checks) {
    sections[c.section].push(c);
  }
  return sections;
}

async function fetchProductionSigning(baseUrl: string, fetchFn: typeof fetch): Promise<boolean | null> {
  try {
    const res = await fetchFn(`${baseUrl}/api/trust/status?sui=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`);
    const json = await res.json() as { infrastructure?: { signing_configured?: boolean } };
    return json.infrastructure?.signing_configured ?? false;
  } catch {
    return null;
  }
}

export async function runReleaseReadiness(
  options: ReleaseReadinessOptions,
  deps: {
    fetch: typeof fetch;
    readFile: (path: string) => string;
    fileExists: (path: string) => boolean;
    env: Record<string, string | undefined>;
    exec: (cmd: string) => void;
  } = {
    fetch,
    readFile: (path) => readFileSync(path, "utf8"),
    fileExists: (path) => existsSync(path),
    env: process.env,
    exec: (cmd) => {
      execSync(cmd, { stdio: "pipe", encoding: "utf8" });
    },
  },
): Promise<ReleaseReadinessResult> {
  const checks: ReleaseReadinessCheck[] = [];
  const generatedAt = new Date().toISOString();
  const baseUrl = options.baseUrl?.replace(/\/$/, "") || null;

  // --- Implemented and deployed (code + optional live probes) ---
  if (options.runRegression) {
    try {
      deps.exec(REGRESSION_CMD);
      checks.push(
        check(
          "regression-subset",
          "implemented_and_deployed",
          "Regression subset (protocol + validity + partner audit + GT wiring)",
          "pass",
          "vitest passed",
        ),
      );
    } catch (e) {
      checks.push(
        check(
          "regression-subset",
          "implemented_and_deployed",
          "Regression subset (protocol + validity + partner audit + GT wiring)",
          "fail",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }
  }

  const preflightDeps: PreflightDeps = {
    fetch: deps.fetch,
    env: deps.env,
    readFile: deps.readFile,
    fileExists: deps.fileExists,
  };
  const preflightOptions = resolvePreflightOptions({
    ...deps.env,
    ...(baseUrl ? { INTEGRATION_PREFLIGHT_BASE_URL: baseUrl } : {}),
  });
  const preflight = await runIntegrationPreflight(
    preflightOptions,
    preflightDeps,
    options.rootDir,
  );
  const preflightFails = preflight.checks.filter(c => c.status === "fail");
  checks.push(
    check(
      "integration-preflight-static",
      "implemented_and_deployed",
      "Integration preflight (static contract + schema files)",
      preflightFails.length === 0 ? "pass" : "fail",
      preflightFails.length === 0
        ? `pass=${preflight.summary.pass}, pending=${preflight.summary.pending}`
        : preflightFails.map(c => c.id).join(", "),
    ),
  );

  const compatManifest = join(options.rootDir, "docs/PROTOCOL_COMPATIBILITY.md");
  checks.push(
    check(
      "protocol-compatibility-doc",
      "implemented_and_deployed",
      "Protocol compatibility document present",
      deps.fileExists(compatManifest) ? "pass" : "fail",
      compatManifest,
    ),
  );

  if (baseUrl) {
    const signing = await fetchProductionSigning(baseUrl, deps.fetch);
    checks.push(
      check(
        "production-signing",
        "implemented_and_deployed",
        "Production signing configured",
        signing === true ? "pass" : signing === false ? "fail" : "pending",
        signing === true
          ? `GET ${baseUrl}/api/trust/status → signing_configured=true`
          : signing === false
            ? "signing_configured=false"
            : "Could not reach production trust status",
      ),
    );
  } else {
    checks.push(
      check(
        "production-signing",
        "implemented_and_deployed",
        "Production signing configured",
        "pending",
        "Set RELEASE_READINESS_BASE_URL or IAT_BASE_URL for live probe",
      ),
    );
  }

  // --- IAT evidence recorded (automated companion + doc parse) ---
  let fullIatClaimed = false;

  if (options.runIatAutomated && baseUrl) {
    const iatOptions = resolveIatAutomatedOptions({
      ...deps.env,
      IAT_BASE_URL: baseUrl,
    });
    const iatResult = await runIatAutomated(iatOptions, defaultIatAutomatedDeps(deps.env));
    checks.push(
      check(
        "iat-automated-companion",
        "iat_evidence_recorded",
        "Automated IAT companion (read-only production probes)",
        iatResult.summary.fail > 0 ? "fail" : "pass",
        `pass=${iatResult.summary.pass}, fail=${iatResult.summary.fail}, human_required=${iatResult.summary.human_required}`,
      ),
    );
  } else {
    checks.push(
      check(
        "iat-automated-companion",
        "iat_evidence_recorded",
        "Automated IAT companion (read-only production probes)",
        "pending",
        baseUrl
          ? "Set RELEASE_READINESS_RUN_IAT=1 to include live automated companion"
          : "Set RELEASE_READINESS_BASE_URL and RELEASE_READINESS_RUN_IAT=1",
      ),
    );
  }

  const walkthroughPath = join(options.rootDir, options.walkthroughPath);
  let walkthroughAssessment = assessWalkthroughEvidence("");
  if (deps.fileExists(walkthroughPath)) {
    walkthroughAssessment = assessWalkthroughEvidence(deps.readFile(walkthroughPath));
    checks.push(
      check(
        "iat-walkthrough-automated-entry",
        "iat_evidence_recorded",
        "Walkthrough doc records automated IAT companion run",
        walkthroughAssessment.automatedCompanionRecorded ? "pass" : "pending",
        walkthroughAssessment.automatedCompanionRecorded
          ? "docs/PRODUCTION_WALKTHROUGH_RESULTS.md includes automated companion summary (Full IAT claimed: No)"
          : "No sanitized automated companion entry found",
      ),
    );
    checks.push(
      check(
        "iat-scenario-a-artifacts",
        "iat_evidence_recorded",
        "Scenario A evidence artifacts (decision_id, receipt_id, signature, callback, flow_trace_id)",
        walkthroughAssessment.scenarioAComplete ? "pass" : "human_required",
        walkthroughAssessment.scenarioAComplete
          ? "Scenario A evidence fields populated in walkthrough results"
          : `Missing: ${walkthroughAssessment.missingForScenarioA.join("; ") || "Scenario A not executed"}`,
      ),
    );
    fullIatClaimed = walkthroughAssessment.fullIatComplete;
    checks.push(
      check(
        "iat-scenarios-a-d",
        "iat_evidence_recorded",
        "Full IAT scenarios A–D signed in walkthrough results",
        fullIatClaimed ? "pass" : "human_required",
        fullIatClaimed
          ? "All scenarios marked PASS with Scenario A artifact requirements met"
          : walkthroughAssessment.missingForFullIat.slice(0, 4).join("; ")
            + (walkthroughAssessment.missingForFullIat.length > 4 ? "…" : ""),
      ),
    );
  } else {
    checks.push(
      check(
        "iat-walkthrough-doc",
        "iat_evidence_recorded",
        "Production walkthrough results document",
        "fail",
        `Missing ${options.walkthroughPath}`,
      ),
    );
  }

  // --- Human evidence still required ---
  checks.push(
    check(
      "human-iat-browser",
      "human_evidence_required",
      "Human browser IAT (OAuth, consent, capture, admin approval)",
      fullIatClaimed ? "pass" : "human_required",
      "docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md",
    ),
  );
  checks.push(
    check(
      "human-deploy-sha",
      "human_evidence_required",
      "Operator confirms production deploy SHA matches release commit",
      "human_required",
      "Record in docs/PRODUCTION_WALKTHROUGH_RESULTS.md and docs/RELEASE_DECISION.md",
    ),
  );
  checks.push(
    check(
      "human-migrations",
      "human_evidence_required",
      "Operator confirms Supabase migrations applied (049–055 as applicable)",
      "human_required",
      "Supabase migration audit — not verified by this command",
    ),
  );
  checks.push(
    check(
      "human-audit-trace",
      "human_evidence_required",
      "Operator audit trace correlation on completed flow",
      "human_required",
      "npm run audit:partner-flow-trace -- ft_vr_<verification_request_id> (requires service role; read-only)",
    ),
  );

  // --- Independent security review pending ---
  let securityReviewClaimed = false;
  const reviewArtifact = options.securityReviewArtifactPath
    ? join(options.rootDir, options.securityReviewArtifactPath)
    : null;
  if (reviewArtifact && deps.fileExists(reviewArtifact)) {
    const content = deps.readFile(reviewArtifact).trim();
    securityReviewClaimed = content.length > 200 && !/not performed|no review/i.test(content.slice(0, 500));
    checks.push(
      check(
        "external-security-review",
        "security_review_pending",
        "Independent external security review report",
        securityReviewClaimed ? "pass" : "blocked",
        reviewArtifact,
      ),
    );
  } else {
    checks.push(
      check(
        "external-security-review",
        "security_review_pending",
        "Independent external security review report",
        "blocked",
        "No artifact at reports/external-security-review/independent-review.md — readiness package only",
      ),
    );
  }

  // --- Second relying-party pilot pending ---
  checks.push(
    check(
      "second-partner-provisioning",
      "second_partner_pilot_pending",
      "Second relying-party partner row + policy + allowlisted return_url",
      "human_required",
      "Operator steps: docs/SECOND_PARTNER_PILOT_RUNBOOK.md §1–2",
    ),
  );
  checks.push(
    check(
      "second-partner-conformance",
      "second_partner_pilot_pending",
      "Partner Flow Conformance Kit (npm run partner:conformance)",
      "pending",
      "Requires PARTNER_FLOW_RP_* env after operator provisioning",
    ),
  );
  checks.push(
    check(
      "second-partner-live-flow",
      "second_partner_pilot_pending",
      "Live evaluate → consent/Passport → complete → callback + receipt + audit trace",
      "human_required",
      "docs/SECOND_PARTNER_PILOT_RUNBOOK.md §4–6",
    ),
  );

  // --- Beta tag pending ---
  checks.push(
    check(
      "release-decision-signed",
      "beta_tag_pending",
      "Release decision signed (docs/RELEASE_DECISION.md)",
      "pending",
      "Draft — complete when all gates pass",
    ),
  );
  checks.push(
    check(
      "beta-tag-v1",
      "beta_tag_pending",
      "Git tag v1.0.0-beta.0",
      "pending",
      "Do not create until IAT + security review disposition + signed release decision",
    ),
  );

  const summary = summarize(checks);
  const exitCode = summary.fail > 0 ? 1 : 0;

  return {
    generatedAt,
    baseUrl,
    checks,
    summary,
    bySection: groupBySection(checks),
    exitCode,
    fullIatClaimed,
    securityReviewClaimed,
  };
}

export function formatReleaseReadinessReport(result: ReleaseReadinessResult): string {
  const lines: string[] = [
    "=== Abraxas release readiness (read-only) ===",
    "",
    `Generated: ${result.generatedAt}`,
    `Base URL: ${result.baseUrl ?? "(not set — static checks only)"}`,
    `Full IAT claimed: ${result.fullIatClaimed ? "Yes" : "No"}`,
    `Security review claimed: ${result.securityReviewClaimed ? "Yes" : "No"}`,
    "",
  ];

  const sectionTitles: Record<ReleaseReadinessSection, string> = {
    implemented_and_deployed: "Implemented and deployed",
    iat_evidence_recorded: "IAT evidence recorded",
    human_evidence_required: "Human evidence still required",
    security_review_pending: "Independent security review pending",
    second_partner_pilot_pending: "Second relying-party pilot pending",
    beta_tag_pending: "Beta tag pending",
  };

  for (const [section, title] of Object.entries(sectionTitles) as Array<[ReleaseReadinessSection, string]>) {
    const rows = result.bySection[section];
    if (rows.length === 0) continue;
    lines.push(`## ${title}`);
    for (const row of rows) {
      const icon =
        row.status === "pass" ? "✓"
          : row.status === "fail" ? "✗"
            : row.status === "blocked" ? "⊘"
              : row.status === "human_required" ? "◎"
                : "…";
      lines.push(`${icon} [${row.status.toUpperCase()}] ${row.label}`);
      lines.push(`    ${row.evidence}`);
    }
    lines.push("");
  }

  lines.push("--- Summary ---");
  lines.push(
    `PASS=${result.summary.pass} FAIL=${result.summary.fail} PENDING=${result.summary.pending} HUMAN_REQUIRED=${result.summary.human_required} BLOCKED=${result.summary.blocked}`,
  );
  lines.push("");
  lines.push("See docs/RELEASE_READINESS.md · docs/BETA_GATE_EVIDENCE.md");

  return lines.join("\n");
}

export function resolveReleaseReadinessOptions(
  env: Record<string, string | undefined> = process.env,
  rootDir = process.cwd(),
): ReleaseReadinessOptions {
  const baseUrl =
    env.RELEASE_READINESS_BASE_URL?.trim()
    || env.IAT_BASE_URL?.trim()
    || env.BETA_GATE_BASE_URL?.trim()
    || env.AUDIT_BASE_URL?.trim()
    || null;

  return {
    baseUrl,
    rootDir,
    walkthroughPath: "docs/PRODUCTION_WALKTHROUGH_RESULTS.md",
    securityReviewArtifactPath:
      env.SECURITY_REVIEW_ARTIFACT_PATH?.trim()
      || "reports/external-security-review/independent-review.md",
    runRegression: env.RELEASE_READINESS_SKIP_REGRESSION !== "1",
    runIatAutomated: env.RELEASE_READINESS_RUN_IAT === "1",
  };
}
