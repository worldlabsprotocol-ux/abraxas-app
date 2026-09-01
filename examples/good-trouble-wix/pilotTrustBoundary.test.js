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
      "sha256Adapter.js",
    ].map((name) => readFileSync(join(BACKEND_DIR, name), "utf8")).join("\n");
    expect(sensitive).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(sensitive).not.toContain("good_trouble_age_verified_pilot");
  });

  it("is not used in popup start path (traditional yesButton remains separate)", () => {
    const popupSource = readFileSync(join(ROOT, "pages/AgeVerificationPopup.js"), "utf8");
    const logicSource = readFileSync(join(ROOT, "pages/ageVerificationPopupLogic.js"), "utf8");
    expect(popupSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(logicSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(popupSource).toContain("#yesButton");
    expect(popupSource).toContain("#noButton");
    expect(popupSource).not.toContain("good_trouble_age_verified_pilot");
  });

  it("does not gate traditional yesButton behind Abraxas or CAPTCHA", () => {
    const popupSource = readFileSync(join(ROOT, "pages/AgeVerificationPopup.js"), "utf8");
    const logicSource = readFileSync(join(ROOT, "pages/ageVerificationPopupLogic.js"), "utf8");
    expect(popupSource).not.toMatch(/setButtonEnabled\("#yesButton",\s*false\)/);
    expect(logicSource).not.toContain("setProtectedButtonsEnabled");
    const traditionalHandler = logicSource.match(
      /async onTraditionalYesClick\(\) \{([\s\S]*?)\n    \},/,
    )?.[1] ?? "";
    expect(traditionalHandler).not.toContain("captcha");
  });

  it("does not navigate popup directly to the result page", () => {
    const popupSource = readFileSync(join(ROOT, "pages/AgeVerificationPopup.js"), "utf8");
    expect(popupSource).not.toContain("age-verification-result");
    expect(popupSource).toContain("wixLocationFrontend.to(url)");
  });

  it("does not require captcha element or token for the Abraxas route", () => {
    const popupSource = readFileSync(join(ROOT, "pages/AgeVerificationPopup.js"), "utf8");
    const logicSource = readFileSync(join(ROOT, "pages/ageVerificationPopupLogic.js"), "utf8");
    expect(popupSource).not.toMatch(/\$w\("#abraxasCaptcha"\)/);
    expect(popupSource).not.toContain("captcha.token");
    expect(logicSource).not.toContain("onCaptchaVerified");
    expect(logicSource).not.toContain("onCaptchaInvalidated");
  });

  it("does not grant pilot verified state when only starting a flow", () => {
    const popupSource = readFileSync(join(ROOT, "pages/AgeVerificationPopup.js"), "utf8");
    const logicSource = readFileSync(join(ROOT, "pages/ageVerificationPopupLogic.js"), "utf8");
    const webSource = readFileSync(join(BACKEND_DIR, "abraxasVerification.web.js"), "utf8");
    expect(popupSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(logicSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(webSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
    expect(logicSource).not.toMatch(/verified:\s*true/);
  });

  it("uses traditional self-attestation localStorage only — not Abraxas pilot flag", () => {
    const logicSource = readFileSync(join(ROOT, "pages/ageVerificationPopupLogic.js"), "utf8");
    expect(logicSource).toContain("good_trouble_age_self_attested");
    expect(logicSource).not.toContain("good_trouble_age_verified_pilot");
  });

  it("does not appear anywhere else in the repository backend", () => {
    const serviceSource = readFileSync(join(BACKEND_DIR, "abraxasVerificationService.js"), "utf8");
    expect(serviceSource).not.toContain(PILOT_VERIFIED_SESSION_FLAG);
  });
});
