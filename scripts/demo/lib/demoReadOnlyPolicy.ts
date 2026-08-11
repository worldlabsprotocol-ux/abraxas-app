// FILE: scripts/demo/lib/demoReadOnlyPolicy.ts
// Static read-only policy patterns for Phase A validators (defense in depth only).

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FORBIDDEN_MUTATION_PATTERNS = [
  [".", "insert", "("].join(""),
  [".", "update", "("].join(""),
  [".", "upsert", "("].join(""),
  [".", "delete", "("].join(""),
  [".", "rpc", "("].join(""),
] as const;

export const FORBIDDEN_SQL_MUTATION_PATTERNS = [
  /\binsert\s+into\b/i,
  /\bupdate\s+\w+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /\bupsert\s+into\b/i,
  /\bdrop\s+(table|function|index)\b/i,
  /\balter\s+table\b/i,
  /\btruncate\s+table\b/i,
] as const;

export const FORBIDDEN_FETCH_PATTERNS = [
  /\bfetch\s*\([^)]*method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,
  /\bfetch\s*\([^)]*['"](?:POST|PUT|PATCH|DELETE)['"]/i,
] as const;

export const FORBIDDEN_STORAGE_PATTERNS = [
  [".", "storage", ".from", "("].join(""),
  [".", "upload", "("].join(""),
  [".", "remove", "("].join(""),
  [".", "move", "("].join(""),
  [".", "copy", "("].join(""),
] as const;

export const READ_ONLY_POLICY_SCAN_ROOTS = [
  "scripts/demo/validate-partner-sandbox-environment.ts",
  "scripts/demo/lib/demoEnvironmentChecks.ts",
  "scripts/demo/lib/demoProjectGuard.ts",
  "scripts/demo/lib/demoMigrationManifest.ts",
  "scripts/demo/lib/knownProductionSupabaseProjectRefs.ts",
  "scripts/demo/lib/demoReadOnlyPolicy.ts",
] as const;

export interface ReadOnlyPolicyViolation {
  file: string;
  pattern: string;
}

function resolvePolicyPath(relativePath: string): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, "..", "..", "..", relativePath);
}

export function findReadOnlyPolicyViolations(
  source: string,
  fileLabel = "<source>",
  options?: { includeRegexPatterns?: boolean },
): ReadOnlyPolicyViolation[] {
  const violations: ReadOnlyPolicyViolation[] = [];
  const includeRegexPatterns = options?.includeRegexPatterns ?? true;

  for (const pattern of FORBIDDEN_MUTATION_PATTERNS) {
    if (source.includes(pattern)) {
      violations.push({ file: fileLabel, pattern });
    }
  }

  for (const pattern of FORBIDDEN_STORAGE_PATTERNS) {
    if (source.includes(pattern)) {
      violations.push({ file: fileLabel, pattern });
    }
  }

  if (includeRegexPatterns) {
    for (const pattern of FORBIDDEN_SQL_MUTATION_PATTERNS) {
      if (pattern.test(source)) {
        violations.push({ file: fileLabel, pattern: pattern.source });
      }
    }

    for (const pattern of FORBIDDEN_FETCH_PATTERNS) {
      if (pattern.test(source)) {
        violations.push({ file: fileLabel, pattern: pattern.source });
      }
    }
  }

  return violations;
}

export function assertReadOnlySource(source: string, fileLabel = "<source>"): void {
  const violations = findReadOnlyPolicyViolations(source, fileLabel);
  if (violations.length > 0) {
    const first = violations[0];
    throw new Error(`Forbidden mutation pattern detected in ${first.file}: ${first.pattern}`);
  }
}

export function scanReadOnlyPolicyModules(
  roots: readonly string[] = READ_ONLY_POLICY_SCAN_ROOTS,
): ReadOnlyPolicyViolation[] {
  const violations: ReadOnlyPolicyViolation[] = [];

  for (const relativePath of roots) {
    const absolutePath = resolvePolicyPath(relativePath);
    if (!existsSync(absolutePath)) {
      violations.push({ file: relativePath, pattern: "<missing-module>" });
      continue;
    }

    const source = readFileSync(absolutePath, "utf8");
    violations.push(
      ...findReadOnlyPolicyViolations(source, relativePath, {
        includeRegexPatterns: !relativePath.endsWith("demoReadOnlyPolicy.ts"),
      }),
    );
  }

  return violations;
}

export function assertReadOnlyPolicyModules(
  roots: readonly string[] = READ_ONLY_POLICY_SCAN_ROOTS,
): void {
  const violations = scanReadOnlyPolicyModules(roots);
  if (violations.length > 0) {
    const first = violations[0];
    throw new Error(`Read-only policy violation in ${first.file}: ${first.pattern}`);
  }
}
