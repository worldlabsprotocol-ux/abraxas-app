// FILE: scripts/launchpad-staging-smoke/report.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { redactSensitiveText } from "./redact";

export type StepStatus = "pass" | "fail" | "skip" | "blocked";

export interface SmokeStepResult {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface SmokeReport {
  targetUrl: string;
  expectedSupabaseRef: string;
  detectedSupabaseRef: string | null;
  detectedDeploymentEnvironment: string | null;
  previewCommitSha: string | null;
  commitSha: string;
  timestamp: string;
  testId: string;
  steps: SmokeStepResult[];
  authorizationMatrix: SmokeStepResult[];
  hostileUrlMatrix: SmokeStepResult[];
  desktopUx: SmokeStepResult[];
  mobileUx: SmokeStepResult[];
  consoleErrors: string[];
  failedNetwork: Array<{ url: string; status: number; method: string }>;
  screenshotPaths: string[];
  operatorSteps: string[];
  cleanupStatus: string;
  migrationsValidated: boolean;
  overallVerdict: "PASS" | "FAIL" | "BLOCKED";
}

export function buildReportPath(testId: string): string {
  const dir = resolve(process.cwd(), "reports/launchpad-staging-smoke");
  mkdirSync(dir, { recursive: true });
  return resolve(dir, `${testId}.md`);
}

export function writeSmokeReport(report: SmokeReport): string {
  const path = buildReportPath(report.testId);
  const lines: string[] = [
    "# Partner Launchpad staging smoke report",
    "",
    `**Overall verdict:** ${report.overallVerdict}`,
    `**Timestamp:** ${report.timestamp}`,
    `**Commit tested:** ${report.commitSha}`,
    `**Test identifier:** ${report.testId}`,
    "",
    "## Environment",
    "",
    `- Target URL: ${report.targetUrl}`,
    `- Expected demo Supabase ref: ${report.expectedSupabaseRef}`,
    `- Detected demo Supabase ref: ${report.detectedSupabaseRef ?? "not detected"}`,
    `- Detected deployment environment: ${report.detectedDeploymentEnvironment ?? "not detected"}`,
    `- Preview commit SHA: ${report.previewCommitSha ?? "not detected"}`,
    `- Harness commit SHA: ${report.commitSha}`,
    `- Migrations 084/085 validated in demo: ${report.migrationsValidated ? "yes" : "no"}`,
    "",
    "## Walkthrough steps",
    "",
    ...report.steps.map((s) => `- [${s.status}] ${s.id}: ${s.label}${s.detail ? ` — ${redactSensitiveText(s.detail)}` : ""}`),
    "",
    "## Authorization matrix",
    "",
    ...report.authorizationMatrix.map((s) => `- [${s.status}] ${s.label}${s.detail ? ` — ${redactSensitiveText(s.detail)}` : ""}`),
    "",
    "## Hostile return URL matrix",
    "",
    ...report.hostileUrlMatrix.map((s) => `- [${s.status}] ${s.label}${s.detail ? ` — ${redactSensitiveText(s.detail)}` : ""}`),
    "",
    "## Desktop UX (1440×900)",
    "",
    ...report.desktopUx.map((s) => `- [${s.status}] ${s.label}${s.detail ? ` — ${s.detail}` : ""}`),
    "",
    "## Mobile UX (iPhone 13)",
    "",
    ...report.mobileUx.map((s) => `- [${s.status}] ${s.label}${s.detail ? ` — ${s.detail}` : ""}`),
    "",
    "## Console errors",
    "",
    ...(report.consoleErrors.length ? report.consoleErrors.map((e) => `- ${redactSensitiveText(e)}`) : ["- none"]),
    "",
    "## Failed network requests",
    "",
    ...(report.failedNetwork.length
      ? report.failedNetwork.map((n) => `- ${n.method} ${n.url} (${n.status})`)
      : ["- none"]),
    "",
    "## Screenshots",
    "",
    ...(report.screenshotPaths.length ? report.screenshotPaths.map((p) => `- ${p}`) : ["- none"]),
    "",
    "## Operator-only steps",
    "",
    ...(report.operatorSteps.length ? report.operatorSteps.map((s) => `- ${s}`) : ["- none"]),
    "",
    "## Cleanup",
    "",
    report.cleanupStatus,
    "",
  ];

  writeFileSync(path, lines.join("\n"), "utf8");
  return path;
}

export function summarizeReport(report: SmokeReport): {
  walkthroughPass: number;
  walkthroughFail: number;
  walkthroughBlocked: number;
} {
  const walkthroughPass = report.steps.filter((s) => s.status === "pass").length;
  const walkthroughFail = report.steps.filter((s) => s.status === "fail").length;
  const walkthroughBlocked = report.steps.filter((s) => s.status === "blocked").length;
  return { walkthroughPass, walkthroughFail, walkthroughBlocked };
}
