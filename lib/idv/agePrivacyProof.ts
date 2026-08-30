// FILE: lib/idv/agePrivacyProof.ts
// Recursive scan helpers — ensure age/DOB never appears in partner-visible outputs.

export const FORBIDDEN_AGE_PRIVACY_KEYS = [
  "date_of_birth",
  "dateOfBirth",
  "dob",
  "birth_date",
  "birthDate",
  "document_date_of_birth",
  "calculated_age",
  "age_years",
] as const;

export const FORBIDDEN_AGE_PRIVACY_VALUE_PATTERNS = [
  /\bdate_of_birth\b/i,
  /\bdateOfBirth\b/,
  /\bdob\b/i,
  /\bbirth[\s_-]?date\b/i,
  /\b19\d{2}-\d{2}-\d{2}\b/,
  /\b20\d{2}-\d{2}-\d{2}\b/,
] as const;

const ALLOWED_ELIGIBILITY_OUTCOMES = new Set(["over_21"]);

export interface AgePrivacyScanResult {
  ok: boolean;
  violations: string[];
}

function isAllowedProductEligibilityValue(value: unknown, path: string): boolean {
  if (!path.endsWith(".outcome") && !path.endsWith("claim_value.outcome")) return false;
  return typeof value === "string" && ALLOWED_ELIGIBILITY_OUTCOMES.has(value);
}

function isViolationDiagnosticString(value: string): boolean {
  return /:forbidden_(key|string_pattern|calculated_age)/.test(value);
}

export function scanValueForAgePrivacyViolations(
  value: unknown,
  path = "root",
): AgePrivacyScanResult {
  const violations: string[] = [];

  function walk(node: unknown, currentPath: string): void {
    if (node == null) return;

    if (typeof node === "string") {
      if (isViolationDiagnosticString(node)) return;
      for (const pattern of FORBIDDEN_AGE_PRIVACY_VALUE_PATTERNS) {
        if (pattern.test(node) && !isAllowedProductEligibilityValue(node, currentPath)) {
          violations.push(`${currentPath}:forbidden_string_pattern`);
        }
      }
      return;
    }

    if (typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${currentPath}[${index}]`));
      return;
    }

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      const childPath = currentPath === "root" ? key : `${currentPath}.${key}`;
      if (FORBIDDEN_AGE_PRIVACY_KEYS.includes(key as (typeof FORBIDDEN_AGE_PRIVACY_KEYS)[number])) {
        violations.push(`${childPath}:forbidden_key`);
        continue;
      }
      if (key === "age" && typeof child === "number") {
        violations.push(`${childPath}:calculated_age`);
        continue;
      }
      walk(child, childPath);
    }
  }

  walk(value, path);
  return { ok: violations.length === 0, violations };
}

export function assertAgePrivacySafe(value: unknown, label: string): void {
  const result = scanValueForAgePrivacyViolations(value, label);
  if (!result.ok) {
    throw new Error(`Age privacy violation in ${label}: ${result.violations.join(", ")}`);
  }
}
