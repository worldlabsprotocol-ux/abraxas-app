// FILE: examples/good-trouble-wix/pages/goodTroubleAgeGateHardening.integration.test.js

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const POPUP = readFileSync(new URL("./AgeVerificationPopup.js", import.meta.url), "utf8");
const MASTER = readFileSync(new URL("./GoodTroubleMasterPage.js", import.meta.url), "utf8");

describe("Good Trouble age gate hardening (Wix deploy contract)", () => {
  it("closes age lightbox synchronously before async popup controller init", () => {
    const immediateIndex = POPUP.indexOf("immediateSkip");
    const controllerIndex = POPUP.indexOf("popupController =\n        createPopupController");
    expect(immediateIndex).toBeGreaterThan(-1);
    expect(controllerIndex).toBeGreaterThan(immediateIndex);
    expect(POPUP).toContain("wixWindow.lightbox.close()");
  });

  it("master page imports siteAgeGatePolicy and closes lightbox when suppressed", () => {
    expect(MASTER).toContain('from "public/siteAgeGatePolicy"');
    expect(MASTER).toContain("shouldSuppressAutomaticAgeLightbox");
    expect(MASTER).toContain("wixWindow.lightbox.close()");
  });
});
