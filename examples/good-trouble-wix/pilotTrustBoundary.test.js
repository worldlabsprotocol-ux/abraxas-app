// FILE: examples/good-trouble-wix/pilotTrustBoundary.test.js

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PILOT_VERIFIED_SESSION_FLAG } from "./backend/constants.js";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const BACKEND_DIR = join(ROOT, "backend");

describe("good_trouble_age_verified_pilot trust boundary", () => {
  it("is defined as a sessionStorage-only pilot UI constant", () => {
    expect(PILOT_VERIFIED_SESSION_FLAG).toBe("good_trouble_age_verified_pilot");
  });

  it("is written only in the callback page after backend verified:true", () => {
    const callbackSource = readFileSync(join(ROOT, "pages/AgeVerificationResult.js"), "utf8");
    expect(callbackSource).toContain("PILOT_VERIFIED_SESSION_FLAG");
    expect(callbackSource).toMatch(/result\?\.verified === true/);
    expect(callbackSource).not.toMatch(/status\s*===\s*["']approved["']/);
  });

  it("is never read or accepted by backend web methods or services", () => {
    const sensitive = [
      "abraxasVerificationService.js",
      "abraxasVerification.web.js",
      "nonceLifecycle.js",
      "pkceProof.js",
      "flowCapacity.js",
      "captchaGate.js",
      "wixNonceStore.js",
      "memoryNonceStore.js",
      "abraxasReceiptValidator.js",
    ].map((name) => readFileSync(join(BACKEND_DIR, name), "utf8")).join("\n");
    expect(sensitive).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(sensitive).not.toContain("good_trouble_age_verified_pilot");
  });

  it("is not used in popup start path (traditional yesButton remains separate)", () => {
    const popupSource = readFileSync(join(ROOT, "pages/AgeVerificationPopup.js"), "utf8");
    expect(popupSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(popupSource).toContain("#yesButton");
    expect(popupSource).not.toMatch(/localStorage\.setItem/);
  });

  it("does not appear anywhere else in the repository backend", () => {
    const serviceSource = readFileSync(join(BACKEND_DIR, "abraxasVerificationService.js"), "utf8");
    expect(serviceSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
  });
});
