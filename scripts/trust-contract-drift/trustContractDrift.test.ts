// FILE: scripts/trust-contract-drift/trustContractDrift.test.ts

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  executeTrustContractDriftCheck,
  formatFindingsReport,
  resolveExitCode,
  runTrustContractDriftCheck,
} from "./check";
import {
  runTrustContractDriftRules,
  sanitizeExcerpt,
  TrustContractToolError,
} from "./rules";

const CANONICAL_ACTIVATION = `export const AUDIENCE_OPERATOR = {
  body: "Abraxas operators review applications and issue sandbox or production policies. There is no self-serve production access.",
};`;

const CANONICAL_OPENAPI = `export const PARTNER_FLOW_RECEIPT_SECURITY_FIELDS = [
  "signature_valid",
  "decision_result",
  "status",
  "expires_at",
  "production_usable",
  "partner_id",
  "policy_id",
] as const;`;

const ALIGNED_RECEIPT_CHECKS = `export const PARTNER_FLOW_RECEIPT_CHECKS = [
  { check: "signature_valid === true", why: "signature" },
  { check: "decision_result === \\"approved\\"", why: "approved" },
  { check: "status === \\"active\\"", why: "active" },
  { check: "expires_at present, valid, and not passed", why: "ttl" },
  { check: "production_usable === true", why: "production" },
  { check: "partner_id matches your integration", why: "partner" },
  { check: "policy_id matches your gate", why: "policy" },
] as const;`;

function writeFixtureRepo(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
}

function baseFixtureFiles(): Record<string, string> {
  return {
    "lib/activation/activationCopy.ts": CANONICAL_ACTIVATION,
    "lib/partner/partnerFlowOpenApiContract.ts": CANONICAL_OPENAPI,
    "lib/partner/partnerFlowIntegratorKit.ts": ALIGNED_RECEIPT_CHECKS,
  };
}

describe("trust contract drift rules", () => {
  it("records a review_needed provisioning conflict with both evidence locations", () => {
    const root = mkdtempSync(join(tmpdir(), "tcd-provision-"));
    writeFixtureRepo(root, {
      ...baseFixtureFiles(),
      "lib/integrate/partnerJourney.ts":
        'export const COPY = "Launch self-serve production access from the dashboard.";',
    });

    const result = runTrustContractDriftRules({
      repoRoot: root,
      changedFiles: ["lib/integrate/partnerJourney.ts"],
      readFile: (rel) => readFileSync(join(root, rel), "utf8"),
    });

    expect(result.rulesRun).toContain("provisioning.self_serve_conflict");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("review_needed");
    expect(result.findings[0].ruleId).toBe("provisioning.self_serve_conflict");
    expect(result.findings[0].evidence).toHaveLength(2);
    expect(result.findings[0].evidence[0].file).toBe("lib/integrate/partnerJourney.ts");
    expect(result.findings[0].evidence[1].file).toBe("lib/activation/activationCopy.ts");
  });

  it("emits no receipt finding when integrator checks align with the security field contract", () => {
    const root = mkdtempSync(join(tmpdir(), "tcd-receipt-ok-"));
    writeFixtureRepo(root, baseFixtureFiles());

    const result = runTrustContractDriftRules({
      repoRoot: root,
      changedFiles: ["lib/partner/partnerFlowIntegratorKit.ts"],
      readFile: (rel) => readFileSync(join(root, rel), "utf8"),
    });

    expect(result.rulesRun).toContain("receipt.public_verification_drift");
    expect(result.findings.filter((f) => f.ruleId === "receipt.public_verification_drift")).toHaveLength(0);
  });

  it("exits 0 when findings are present (report-only)", () => {
    const root = mkdtempSync(join(tmpdir(), "tcd-exit0-"));
    writeFixtureRepo(root, {
      ...baseFixtureFiles(),
      "lib/activation/activationCopy.ts": `${CANONICAL_ACTIVATION}\nexport const BAD = "SOC 2 audited KYC platform";`,
    });

    const outcome = executeTrustContractDriftCheck({
      repoRoot: root,
      changedFiles: ["lib/activation/activationCopy.ts"],
    });

    expect(outcome.status).toBe("findings_report");
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('"status": "findings_report"');
    expect(outcome.stdout).toContain('"exitCode": 0');
    expect(resolveExitCode({ findings: [{ severity: "review_needed" } as never] })).toBe(0);
  });

  it("exits nonzero when a required canonical anchor is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "tcd-anchor-fail-"));
    writeFixtureRepo(root, {
      "lib/activation/activationCopy.ts": 'export const BAD = "missing required excerpt";',
      "lib/partner/partnerFlowOpenApiContract.ts": CANONICAL_OPENAPI,
      "lib/partner/partnerFlowIntegratorKit.ts": ALIGNED_RECEIPT_CHECKS,
    });

    const outcome = executeTrustContractDriftCheck({
      repoRoot: root,
      changedFiles: ["lib/activation/activationCopy.ts"],
    });

    expect(outcome.status).toBe("tool_failure");
    expect(outcome.exitCode).toBe(1);
    expect(outcome.stdout).toContain('"status": "tool_failure"');
    expect(outcome.stdout).toContain('"error": "malformed_canonical_anchor"');
    expect(resolveExitCode({ findings: [], toolError: new TrustContractToolError("malformed_canonical_anchor", "x") })).toBe(1);
  });

  it("excludes secret-bearing paths and never reads them", () => {
    const root = mkdtempSync(join(tmpdir(), "tcd-secret-"));
    writeFixtureRepo(root, {
      ...baseFixtureFiles(),
      ".env.local": "SUPABASE_SERVICE_ROLE_KEY=super-secret-value",
    });

    const outcome = executeTrustContractDriftCheck({
      repoRoot: root,
      changedFiles: [".env.local", "app/globals.css"],
    });

    expect(outcome.status).toBe("findings_report");
    expect(outcome.exitCode).toBe(0);
    expect(outcome.readLog.some((path) => path.includes(".env"))).toBe(false);
    expect(outcome.stdout).not.toContain("super-secret-value");
  });

  it("skips all rules for unrelated changed files", () => {
    const root = mkdtempSync(join(tmpdir(), "tcd-css-"));
    writeFixtureRepo(root, baseFixtureFiles());

    const result = runTrustContractDriftRules({
      repoRoot: root,
      changedFiles: ["app/globals.css"],
      readFile: (rel) => readFileSync(join(root, rel), "utf8"),
    });

    expect(result.rulesRun).toHaveLength(0);
    expect(result.findings).toHaveLength(0);
  });

  it("redacts sensitive values from evidence excerpts", () => {
    const sanitized = sanitizeExcerpt(
      'key=abx_live_SECRETKEY123 and token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
    );
    expect(sanitized).not.toContain("abx_live_SECRETKEY123");
    expect(sanitized).not.toContain("eyJhbGci");
    expect(sanitized).toContain("[redacted:api_key]");
    expect(sanitized).toContain("[redacted:jwt]");
  });

  it("formats findings reports separately from tool failures", () => {
    const findingsReport = formatFindingsReport({
      changedFiles: ["components/home/HomeSharpHero.tsx"],
      rulesRun: ["provisioning.self_serve_conflict"],
      findings: [
        {
          severity: "review_needed",
          ruleId: "provisioning.self_serve_conflict",
          message: "example",
          evidence: [],
          remediation: "example",
        },
      ],
    });

    expect(findingsReport).toContain('"status": "findings_report"');
    expect(findingsReport).toContain('"exitCode": 0');
    expect(findingsReport).not.toContain('"status": "tool_failure"');
  });
});
