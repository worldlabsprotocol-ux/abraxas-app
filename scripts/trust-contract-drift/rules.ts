// FILE: scripts/trust-contract-drift/rules.ts
// Deterministic, report-only trust-contract drift rules.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ABSOLUTE_PRIVACY_PATTERNS,
  CANONICAL_ANCHORS,
  DRIFT_RULES,
  isExcludedPath,
  PRODUCTION_AVAILABILITY_REVIEW_PATTERNS,
  REQUIRED_CANONICAL_ANCHOR_KEYS,
  RISKY_ACTIVATION_TERMS,
  SELF_SERVE_CONFLICT_PATTERNS,
  type DriftSeverity,
  type RequiredCanonicalAnchorKey,
} from "./manifest";

export type TrustContractToolErrorCode =
  | "invalid_manifest"
  | "changed_file_resolution_failed"
  | "malformed_canonical_anchor"
  | "excluded_path_read"
  | "internal_execution_error";

export class TrustContractToolError extends Error {
  readonly code: TrustContractToolErrorCode;

  constructor(code: TrustContractToolErrorCode, message: string) {
    super(message);
    this.name = "TrustContractToolError";
    this.code = code;
  }
}

export function formatToolFailureReport(error: TrustContractToolError): string {
  return JSON.stringify(
    {
      status: "tool_failure",
      exitCode: 1,
      error: error.code,
      message: error.message,
    },
    null,
    2,
  );
}

export interface DriftEvidence {
  file: string;
  line: number;
  excerpt: string;
}

export interface DriftFinding {
  severity: DriftSeverity;
  ruleId: string;
  message: string;
  evidence: DriftEvidence[];
  remediation: string;
}

export interface RuleContext {
  repoRoot: string;
  changedFiles: string[];
  readFile: (relPath: string) => string;
  readLog?: string[];
}

function assertReadablePath(relPath: string): void {
  if (isExcludedPath(relPath)) {
    throw new TrustContractToolError(
      "excluded_path_read",
      `Refusing to read excluded path: ${relPath}`,
    );
  }
}

export function createSafeReadFile(
  repoRoot: string,
  readLog: string[],
): (relPath: string) => string {
  return (relPath: string) => {
    assertReadablePath(relPath);
    const abs = resolve(repoRoot, relPath);
    if (!existsSync(abs)) {
      throw new TrustContractToolError(
        "malformed_canonical_anchor",
        `Required canonical anchor file is missing: ${relPath}`,
      );
    }
    readLog.push(relPath);
    return readFileSync(abs, "utf8");
  };
}

export function sanitizeExcerpt(text: string): string {
  return text
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted:jwt]")
    .replace(/\babx_(?:live|sandbox|test)_[A-Za-z0-9]+\b/gi, "[redacted:api_key]")
    .replace(/\bSUPABASE_[A-Z_]+=\S+/g, "[redacted:env_var]")
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]")
    .trim()
    .slice(0, 160);
}

function lineEvidence(file: string, lineNumber: number, line: string): DriftEvidence {
  return {
    file,
    line: lineNumber,
    excerpt: sanitizeExcerpt(line),
  };
}

function findLineByExcerpt(file: string, content: string, needle: string): DriftEvidence {
  const lines = content.split("\n");
  const idx = lines.findIndex((line) => line.includes(needle));
  const lineNumber = idx >= 0 ? idx + 1 : CANONICAL_ANCHORS.manualProvisioning.lineHint;
  const line = idx >= 0 ? lines[idx] : needle;
  return lineEvidence(file, lineNumber, line);
}

function matchesAny(path: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(path));
}

function filterChangedFiles(changedFiles: string[]): string[] {
  return changedFiles.filter((file) => !isExcludedPath(file));
}

function activatedRuleIds(changedFiles: string[]): string[] {
  const active = new Set<string>();
  for (const file of changedFiles) {
    for (const rule of DRIFT_RULES) {
      if (matchesAny(file, rule.watchPatterns)) {
        active.add(rule.id);
      }
    }
  }
  return [...active];
}

function scanTargets(ruleId: string, changedFiles: string[]): string[] {
  const rule = DRIFT_RULES.find((entry) => entry.id === ruleId);
  if (!rule) return [];
  return changedFiles.filter((file) => matchesAny(file, rule.scanPatterns));
}

const RECEIPT_CHECK_LINE_PATTERN = /check:\s*"([^"]+)"/;

function parseReceiptCheckField(checkValue: string): string {
  const trimmed = checkValue.trim();
  const beforeEquals = trimmed.split("===")[0].trim();
  return beforeEquals.split(/\s+/)[0];
}

function extractReceiptCheckFields(content: string): string[] {
  const fields = new Set<string>();
  for (const line of content.split("\n")) {
    const match = line.match(RECEIPT_CHECK_LINE_PATTERN);
    if (match?.[1]) {
      fields.add(parseReceiptCheckField(match[1]));
    }
  }
  return [...fields];
}

function extractQuotedExportArray(content: string, exportName: string): string[] {
  const marker = `export const ${exportName}`;
  const start = content.indexOf(marker);
  if (start < 0) return [];
  const slice = content.slice(start);
  const values: string[] = [];
  const stringPattern = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = stringPattern.exec(slice)) !== null) {
    values.push(match[1]);
    count += 1;
    if (count > 40) break;
  }
  return values.filter((value) => /^[a-z_]+$/.test(value));
}

function checkProvisioningConflict(ctx: RuleContext, targets: string[]): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const canonical = ctx.readFile(CANONICAL_ANCHORS.manualProvisioning.file);
  const canonicalEvidence = findLineByExcerpt(
    CANONICAL_ANCHORS.manualProvisioning.file,
    canonical,
    CANONICAL_ANCHORS.manualProvisioning.excerpt,
  );

  for (const file of targets) {
    const content = ctx.readFile(file);
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/\bno self-serve\b/i.test(line)) continue;
      const conflict = SELF_SERVE_CONFLICT_PATTERNS.find((pattern) => pattern.test(line));
      if (!conflict) continue;
      findings.push({
        severity: "review_needed",
        ruleId: "provisioning.self_serve_conflict",
        message:
          "Public copy claims self-serve production or automatic API-key access, which conflicts with operator-managed provisioning.",
        evidence: [lineEvidence(file, index + 1, line), canonicalEvidence],
        remediation:
          "Remove self-serve production language or route readers to operator review (/integrations#apply, /design-partner).",
      });
      return findings;
    }
  }
  return findings;
}

function checkReceiptDrift(ctx: RuleContext): DriftFinding[] {
  const openapiPath = CANONICAL_ANCHORS.receiptSecurityFields.file;
  const kitPath = CANONICAL_ANCHORS.receiptDocChecks.file;
  const openapi = ctx.readFile(openapiPath);
  const kit = ctx.readFile(kitPath);
  const securityFields = extractQuotedExportArray(openapi, CANONICAL_ANCHORS.receiptSecurityFields.exportName);
  const docChecks = extractReceiptCheckFields(kit);
  const missing = docChecks.filter((field) => !securityFields.includes(field));
  if (missing.length === 0) return [];

  const openapiEvidence = findLineByExcerpt(
    openapiPath,
    openapi,
    CANONICAL_ANCHORS.receiptSecurityFields.exportName,
  );
  const kitLine = kit.split("\n").findIndex((line) => line.includes(missing[0]));
  return [
    {
      severity: "proven",
      ruleId: "receipt.public_verification_drift",
      message: `Documented receipt checks reference fields missing from ${CANONICAL_ANCHORS.receiptSecurityFields.exportName}: ${missing.join(", ")}.`,
      evidence: [
        lineEvidence(kitPath, kitLine >= 0 ? kitLine + 1 : 94, kit.split("\n")[kitLine] ?? missing[0]),
        openapiEvidence,
      ],
      remediation:
        "Align PARTNER_FLOW_RECEIPT_CHECKS with PARTNER_FLOW_RECEIPT_SECURITY_FIELDS and verifyPartnerFlowReceipt expectations.",
    },
  ];
}

function checkPrivacyWording(ctx: RuleContext, targets: string[]): DriftFinding[] {
  const findings: DriftFinding[] = [];
  for (const file of targets) {
    const lines = ctx.readFile(file).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const pattern = ABSOLUTE_PRIVACY_PATTERNS.find((entry) => entry.test(line));
      if (!pattern) continue;
      findings.push({
        severity: "review_needed",
        ruleId: "privacy.callback_wording_review",
        message: "Absolute privacy wording may overshoot the documented Partner Flow callback/receipt contract.",
        evidence: [lineEvidence(file, index + 1, line)],
        remediation:
          "Prefer policy-outcome language and cite the Partner Flow receipt contract instead of absolute PII guarantees.",
      });
      return findings;
    }
  }
  return findings;
}

function checkAvailabilityWording(ctx: RuleContext, targets: string[]): DriftFinding[] {
  const findings: DriftFinding[] = [];
  for (const file of targets) {
    const lines = ctx.readFile(file).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const pattern = PRODUCTION_AVAILABILITY_REVIEW_PATTERNS.find((entry) => entry.test(line));
      if (!pattern) continue;
      findings.push({
        severity: "review_needed",
        ruleId: "availability.sandbox_production_wording",
        message: "Production availability wording may imply self-serve access instead of operator-reviewed provisioning.",
        evidence: [lineEvidence(file, index + 1, line)],
        remediation:
          "Clarify sandbox vs production and state that production policies are issued manually after review.",
      });
      return findings;
    }
  }
  return findings;
}

function checkRiskyActivationTerms(ctx: RuleContext, targets: string[]): DriftFinding[] {
  const findings: DriftFinding[] = [];
  for (const file of targets) {
    const lines = ctx.readFile(file).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const lower = lines[index].toLowerCase();
      const term = RISKY_ACTIVATION_TERMS.find((entry) => lower.includes(entry));
      if (!term) continue;
      findings.push({
        severity: "review_needed",
        ruleId: "activation.risky_commercial_claim",
        message: `Activation copy contains risky commercial term "${term}" that needs human review.`,
        evidence: [lineEvidence(file, index + 1, lines[index])],
        remediation:
          "Replace with factual beta-stage language from lib/activation/activationCopy.ts or remove the claim.",
      });
      return findings;
    }
  }
  return findings;
}

function validateCanonicalAnchor(
  key: RequiredCanonicalAnchorKey,
  readFile: (relPath: string) => string,
): void {
  const anchor = CANONICAL_ANCHORS[key];
  const content = readFile(anchor.file);

  if ("excerpt" in anchor && !content.includes(anchor.excerpt)) {
    throw new TrustContractToolError(
      "malformed_canonical_anchor",
      `Canonical anchor ${key} is missing required excerpt in ${anchor.file}.`,
    );
  }

  if ("exportName" in anchor && !content.includes(`export const ${anchor.exportName}`)) {
    throw new TrustContractToolError(
      "malformed_canonical_anchor",
      `Canonical anchor ${key} is missing export ${anchor.exportName} in ${anchor.file}.`,
    );
  }
}

export function validateRequiredCanonicalAnchors(readFile: (relPath: string) => string): void {
  for (const key of REQUIRED_CANONICAL_ANCHOR_KEYS) {
    validateCanonicalAnchor(key, readFile);
  }
}

export function runTrustContractDriftRules(ctx: RuleContext): {
  changedFiles: string[];
  rulesRun: string[];
  findings: DriftFinding[];
} {
  validateRequiredCanonicalAnchors(ctx.readFile);

  const changedFiles = filterChangedFiles(ctx.changedFiles);
  const rulesRun = activatedRuleIds(changedFiles);
  const findings: DriftFinding[] = [];

  if (rulesRun.includes("provisioning.self_serve_conflict")) {
    findings.push(...checkProvisioningConflict(ctx, scanTargets("provisioning.self_serve_conflict", changedFiles)));
  }
  if (rulesRun.includes("receipt.public_verification_drift")) {
    findings.push(...checkReceiptDrift(ctx));
  }
  if (rulesRun.includes("privacy.callback_wording_review")) {
    findings.push(...checkPrivacyWording(ctx, scanTargets("privacy.callback_wording_review", changedFiles)));
  }
  if (rulesRun.includes("availability.sandbox_production_wording")) {
    findings.push(...checkAvailabilityWording(ctx, scanTargets("availability.sandbox_production_wording", changedFiles)));
  }
  if (rulesRun.includes("activation.risky_commercial_claim")) {
    findings.push(...checkRiskyActivationTerms(ctx, scanTargets("activation.risky_commercial_claim", changedFiles)));
  }

  return { changedFiles, rulesRun, findings };
}
