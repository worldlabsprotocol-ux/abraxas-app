// FILE: lib/goodTrouble/wixSeekerHandoff.contract.test.ts
// Regression: Wix Seeker handoff docs and purchase age-gate skip wiring stay present.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "examples/good-trouble-wix");
const DOCS = readFileSync(resolve(process.cwd(), "docs/GOOD_TROUBLE_WIX_SEEKER_HANDOFF.md"), "utf8");
const AGE_GATE = readFileSync(resolve(ROOT, "public/ageGateAccessState.js"), "utf8");
const CALLBACK = readFileSync(resolve(ROOT, "pages/AgeVerificationResult.js"), "utf8");
const VALIDATOR = readFileSync(resolve(ROOT, "backend/abraxasReceiptValidator.js"), "utf8");

describe("Good Trouble Wix Seeker handoff contract", () => {
  it("documents Wix install paths and security boundary", () => {
    expect(DOCS).toContain("age-verification-result");
    expect(DOCS).toContain("good_trouble_abraxas_purchase_verified");
    expect(DOCS).toContain("policy version **2**");
    expect(DOCS).toContain("/goods");
  });

  it("wires purchase verified state into age gate skip after callback", () => {
    expect(AGE_GATE).toContain("abraxas_purchase_verified");
    expect(AGE_GATE).toContain("readPurchaseVerifiedState");
    expect(CALLBACK).toContain("persistPurchaseVerifiedState");
    expect(CALLBACK).toContain("result.expires_at");
  });

  it("validates canonical sandbox policy v2 receipts on Wix backend", () => {
    expect(VALIDATOR).toContain("GOOD_TROUBLE_SANDBOX_POLICY_VERSION");
    expect(VALIDATOR).toContain("self_attested_age_band");
    expect(VALIDATOR).toContain("resolvePurchaseReceiptValidationMode");
  });
});
