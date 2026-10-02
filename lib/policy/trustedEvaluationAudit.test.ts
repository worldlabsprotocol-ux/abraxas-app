// FILE: lib/policy/trustedEvaluationAudit.test.ts
// Static audit: production paths must not bypass issuer trust enforcement.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";

const ROOT = join(process.cwd(), "lib");
const APP_API = join(process.cwd(), "app/api");

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      walkTsFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("trusted evaluation audit", () => {
  it("evaluatePolicyRules fails closed when accepted_issuers set without trustContext", () => {
    const rules: PartnerPolicyRules = {
      required_claims: [{
        claim_type: "identity_verified",
        accepted_issuers: ["issuer:trusted"],
        min_assurance: "L2",
      }],
    };
    const forged: CredentialClaimRecord = {
      id: "1",
      subject_id: "0x" + "a".repeat(64),
      credential_jti: null,
      claim_type: "identity_verified",
      claim_value: { outcome: "verified" },
      issuer_id: "issuer:browser-forged",
      assurance_level: "L4",
      issued_at: new Date().toISOString(),
      expires_at: null,
      status: "active",
      revocation_reference: null,
      evidence_reference: null,
      jurisdiction: null,
      policy_scope: null,
    };

    const result = evaluatePolicyRules(rules, [forged]);
    expect(result.decision).not.toBe("approved");
    expect(result.reason_codes.some((c) => c.includes("trust_context_required"))).toBe(true);
  });

  it("evaluateSubjectPolicy.ts always loads trust context before evaluation", () => {
    const source = readFileSync(join(ROOT, "policy/evaluateSubjectPolicy.ts"), "utf8");
    expect(source).toContain("loadPolicyTrustContext");
    expect(source).toContain("evaluatePolicyRules(effectiveRules, mergedClaims, {");
  });

  it("production lib/ and app/api/ sources do not call evaluatePolicyRules without context when rules include accepted_issuers", () => {
    const offenders: string[] = [];
    const files = [...walkTsFiles(ROOT), ...walkTsFiles(APP_API)];

    for (const file of files) {
      if (file.includes("evaluatePolicy.ts")) continue;
      if (file.includes("institutionalKycReadiness")) continue;
      if (file.includes("progressiveProof")) continue;
      if (file.includes("scripts/")) continue;

      const source = readFileSync(file, "utf8");
      if (!source.includes("evaluatePolicyRules(")) continue;
      if (!source.includes("accepted_issuers")) continue;

      const hasTrustLoad =
        source.includes("loadPolicyTrustContext")
        || source.includes("trustRulesByClaimType")
        || source.includes("evaluatePolicyForSubject");

      if (!hasTrustLoad && source.includes("evaluatePolicyRules(")) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
    }

    expect(offenders).toEqual([]);
  });
});
