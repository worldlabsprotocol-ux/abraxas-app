#!/usr/bin/env npx tsx
// FILE: scripts/trust-contract-drift/check.ts
// Trust-contract drift check — findings are report-only (exit 0); tool failures exit nonzero.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateManifestConfiguration } from "./manifest";
import {
  createSafeReadFile,
  formatToolFailureReport,
  runTrustContractDriftRules,
  TrustContractToolError,
  type DriftFinding,
} from "./rules";

export const DRIFT_REPO_ROOT = resolve(__dirname, "../..");

function tryResolveFromGitHubPullRequest(repoRoot: string): string[] | null {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return null;

  try {
    const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
      pull_request?: { base?: { sha?: string } };
    };
    const baseSha = event.pull_request?.base?.sha;
    if (!baseSha) return null;

    execSync(`git fetch --depth=64 origin ${baseSha}`, {
      cwd: repoRoot,
      stdio: "pipe",
    });
    const output = execSync(`git diff --name-only ${baseSha} HEAD`, {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return output.split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

export function resolveChangedFiles(repoRoot: string = DRIFT_REPO_ROOT): string[] {
  const fromEnv = process.env.TRUST_CONTRACT_CHANGED_FILES?.trim();
  if (fromEnv) {
    return fromEnv
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  const fromPullRequest = tryResolveFromGitHubPullRequest(repoRoot);
  if (fromPullRequest) return fromPullRequest;

  const baseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : "origin/main";

  let resolutionError: Error | undefined;

  try {
    if (process.env.GITHUB_BASE_REF) {
      execSync(`git fetch --depth=64 origin ${process.env.GITHUB_BASE_REF}`, {
        cwd: repoRoot,
        stdio: "pipe",
      });
    }
    const output = execSync(`git diff --name-only ${baseRef} HEAD`, {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return output.split("\n").filter(Boolean);
  } catch (error) {
    resolutionError = error instanceof Error ? error : new Error(String(error));
  }

  try {
    const output = execSync("git diff --name-only HEAD~1..HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return output.split("\n").filter(Boolean);
  } catch (fallbackError) {
    const detail = resolutionError?.message ?? String(resolutionError ?? "unknown");
    const fallbackDetail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
    throw new TrustContractToolError(
      "changed_file_resolution_failed",
      `Could not resolve changed files via git diff (${baseRef} HEAD or HEAD~1..HEAD). ${detail}; ${fallbackDetail}`,
    );
  }
}

export function formatFindingsReport(input: {
  changedFiles: string[];
  rulesRun: string[];
  findings: DriftFinding[];
}): string {
  return JSON.stringify(
    {
      status: "findings_report",
      exitCode: 0,
      changedFilesScanned: input.changedFiles,
      rulesRun: input.rulesRun,
      findings: input.findings,
    },
    null,
    2,
  );
}

export function resolveExitCode(input: {
  findings: DriftFinding[];
  toolError?: TrustContractToolError;
}): number {
  if (input.toolError) return 1;
  return 0;
}

export function runTrustContractDriftCheck(options?: {
  repoRoot?: string;
  changedFiles?: string[];
}): {
  status: "findings_report";
  exitCode: 0;
  report: string;
  findings: DriftFinding[];
  rulesRun: string[];
  changedFiles: string[];
  readLog: string[];
} {
  try {
    validateManifestConfiguration();
  } catch (error) {
    throw new TrustContractToolError(
      "invalid_manifest",
      error instanceof Error ? error.message : String(error),
    );
  }

  const repoRoot = options?.repoRoot ?? DRIFT_REPO_ROOT;
  const changedFiles = options?.changedFiles ?? resolveChangedFiles(repoRoot);
  const readLog: string[] = [];
  const readFile = createSafeReadFile(repoRoot, readLog);

  const result = runTrustContractDriftRules({
    repoRoot,
    changedFiles,
    readFile,
    readLog,
  });

  const report = formatFindingsReport({
    changedFiles: result.changedFiles,
    rulesRun: result.rulesRun,
    findings: result.findings,
  });

  return {
    status: "findings_report",
    exitCode: 0,
    report,
    findings: result.findings,
    rulesRun: result.rulesRun,
    changedFiles: result.changedFiles,
    readLog,
  };
}

export function executeTrustContractDriftCheck(options?: {
  repoRoot?: string;
  changedFiles?: string[];
}): {
  exitCode: number;
  stdout: string;
  status: "findings_report" | "tool_failure";
  readLog: string[];
} {
  try {
    const result = runTrustContractDriftCheck(options);
    const summary =
      result.findings.length === 0
        ? "\n✓ No trust-contract drift findings for changed files."
        : `\n⚠ ${result.findings.length} finding(s) recorded for engineering review. CI will not fail.`;

    return {
      exitCode: 0,
      status: "findings_report",
      stdout: `Trust Contract Drift Check — findings are report-only (exit 0)\n${result.report}${summary}`,
      readLog: result.readLog,
    };
  } catch (error) {
    if (error instanceof TrustContractToolError) {
      return {
        exitCode: 1,
        status: "tool_failure",
        stdout: `Trust Contract Drift Check — tool/configuration failure (exit 1)\n${formatToolFailureReport(error)}`,
        readLog: [],
      };
    }

    const wrapped = new TrustContractToolError(
      "internal_execution_error",
      error instanceof Error ? error.message : String(error),
    );
    return {
      exitCode: 1,
      status: "tool_failure",
      stdout: `Trust Contract Drift Check — tool/configuration failure (exit 1)\n${formatToolFailureReport(wrapped)}`,
      readLog: [],
    };
  }
}

function main(): void {
  const outcome = executeTrustContractDriftCheck();
  console.log(outcome.stdout);
  process.exit(outcome.exitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
