// FILE: lib/operations/institutionalProof/externalConsumer.test.ts
// External integrator boundary — no internal DB imports.

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const FORBIDDEN_IMPORTS = [
  "requireSupabaseAdmin",
  "identity_subjects",
  "provider_subject_bindings",
  "verification_decisions",
  "getReceiptById",
  "claimsService",
  "subjectStore",
];

describe("external institutional consumer boundary", () => {
  it("externalConsumer.ts does not import internal DB or credential services", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/operations/institutionalProof/externalConsumer.ts"),
      "utf8",
    );
    for (const forbidden of FORBIDDEN_IMPORTS) {
      expect(src).not.toContain(forbidden);
    }
    expect(src).toContain("AbraxasPartnerKit");
    expect(src).toContain("validatePartnerFlowPublicReceipt");
  });

  it("runReferenceScenario uses external consumer for application verification", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/operations/institutionalProof/runReferenceScenario.ts"),
      "utf8",
    );
    expect(src).toContain("ExternalInstitutionalConsumer");
    expect(src).not.toMatch(/ExternalInstitutionalConsumer[\s\S]*requireSupabaseAdmin/);
  });
});
