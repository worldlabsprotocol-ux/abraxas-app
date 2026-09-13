// FILE: examples/good-trouble-wix/wixVeloCompatibility.test.js
// Wix Velo IDE compatibility — static imports, backend export closure, no public cross-imports.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as constants from "./backend/constants.js";
import * as nonceLifecycle from "./backend/nonceLifecycle.js";
import {
  isFlowStartFailure,
  isFlowStartSuccess,
} from "./backend/flowStartDiagnostics.js";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const BACKEND_DIR = join(ROOT, "backend");

const BACKEND_RUNTIME_FILES = readdirSync(BACKEND_DIR).filter(
  (name) => name.endsWith(".js") && !name.endsWith(".test.js"),
);

const REQUIRED_CONSTANT_EXPORTS = [
  "BROWSE_POLICY_ID",
  "FLOW_ID_PREFIX_BROWSE",
  "FLOW_ID_PREFIX_PURCHASE",
  "MAX_OUTSTANDING_PENDING_FLOWS",
  "BROWSE_RETURN_URL_BASE",
  "PURCHASE_RETURN_URL_BASE",
  "GTB_PARAM",
  "GTV_PARAM",
];

const REQUIRED_NONCE_LIFECYCLE_EXPORTS = [
  "buildVerificationStartPayload",
  "completeAbraxasVerificationCore",
  "completeBrowseVerificationCore",
];

describe("Wix Velo backend compatibility", () => {
  it("constants.js exports the full backend dependency surface", () => {
    for (const symbol of REQUIRED_CONSTANT_EXPORTS) {
      expect(constants[symbol], `missing constants export: ${symbol}`).toBeTruthy();
    }
    expect(constants.GTB_PARAM).toBe("gtb");
    expect(constants.GTV_PARAM).toBe("gtv");
    expect(constants.BROWSE_POLICY_ID).toBe("good-trouble-browse-v1");
  });

  it("constants.js does not import from ../public (Wix backend cannot resolve it)", () => {
    const source = readFileSync(join(BACKEND_DIR, "constants.js"), "utf8");
    expect(source).not.toMatch(/from\s+["']\.\.\/public\//);
  });

  it("nonceLifecycle.js exports required lifecycle functions", () => {
    for (const symbol of REQUIRED_NONCE_LIFECYCLE_EXPORTS) {
      expect(typeof nonceLifecycle[symbol], `missing nonceLifecycle export: ${symbol}`).toBe("function");
    }
  });

  it("backend runtime modules use no await import() dynamic imports", () => {
    for (const file of BACKEND_RUNTIME_FILES) {
      const source = readFileSync(join(BACKEND_DIR, file), "utf8");
      expect(source, `${file} must not use await import()`).not.toMatch(/\bawait\s+import\s*\(/);
    }
  });

  it("abraxasVerificationService.js statically imports wixNonceStore", () => {
    const source = readFileSync(join(BACKEND_DIR, "abraxasVerificationService.js"), "utf8");
    expect(source).toContain('import { createWixNonceStore } from "./wixNonceStore.js"');
    expect(source).not.toMatch(/\bawait\s+import\s*\(/);
  });

  it("flow start results are discriminated unions", () => {
    const failure = {
      error: "rate_limited",
      diagnostic: {
        code: "rate_limited",
        stage: "capacity_precheck",
        purpose: "browse",
        policyId: "good-trouble-browse-v1",
        correlationId: null,
      },
    };
    const success = {
      verifyUrl: "https://abraxasworld.xyz/partner/verify?policy_id=good-trouble-browse-v1&purpose=browse",
      flowId: `gtb_${"a".repeat(64)}`,
      verifier: "b".repeat(64),
      purpose: "browse",
      policyId: "good-trouble-browse-v1",
      correlationId: null,
    };

    expect(isFlowStartFailure(failure)).toBe(true);
    expect(isFlowStartSuccess(failure)).toBe(false);
    expect(isFlowStartFailure(success)).toBe(false);
    expect(isFlowStartSuccess(success)).toBe(true);
  });
});
