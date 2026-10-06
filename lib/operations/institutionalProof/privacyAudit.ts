// FILE: lib/operations/institutionalProof/privacyAudit.ts
// Machine-readable disclosure audit for institutional proof surfaces.

import {
  INSTITUTIONAL_PROOF_FORBIDDEN_FIELDS,
  INSTITUTIONAL_PROOF_FORBIDDEN_VALUE_PATTERNS,
  type ProofPrivacySection,
} from "./contract";

function collectForbiddenMatches(json: string): string[] {
  const lower = json.toLowerCase();
  const fieldMatches = INSTITUTIONAL_PROOF_FORBIDDEN_FIELDS.filter((field) => {
    if (field === "name" && lower.includes('"name"')) return true;
    return lower.includes(`"${field}"`) || lower.includes(`${field}:`);
  });
  const valueMatches = INSTITUTIONAL_PROOF_FORBIDDEN_VALUE_PATTERNS
    .filter((pattern) => pattern.test(json))
    .map((pattern) => `pattern:${pattern.source}`);
  return [...fieldMatches, ...valueMatches];
}

export function auditInstitutionalProofSurfaces(input: {
  applicationA: Record<string, unknown>[];
  applicationB: Record<string, unknown>[];
  surfaces: string[];
}): ProofPrivacySection {
  const scanA = input.applicationA.map((s) => JSON.stringify(s)).join("\n");
  const scanB = input.applicationB.map((s) => JSON.stringify(s)).join("\n");
  const forbiddenA = collectForbiddenMatches(scanA);
  const forbiddenB = collectForbiddenMatches(scanB);
  return {
    application_a_forbidden_field_count: forbiddenA.length,
    application_b_forbidden_field_count: forbiddenB.length,
    forbidden_field_count: new Set([...forbiddenA, ...forbiddenB]).size,
    scan_surfaces: input.surfaces,
  };
}
