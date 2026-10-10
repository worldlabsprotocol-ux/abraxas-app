// FILE: lib/goodTrouble/goodTroubleBrowseSeekerDemo.contract.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_BROWSE_SEEKER_DEMO } from "@/lib/goodTrouble/browseSeekerDemoEntry";

const WIX_CALLBACK = readFileSync(
  resolve(process.cwd(), "examples/good-trouble-wix/pages/BrowseVerificationResult.js"),
  "utf8",
);
const BROWSE_CALLBACK_LOGIC = readFileSync(
  resolve(process.cwd(), "examples/good-trouble-wix/public/browseCallbackLogic.js"),
  "utf8",
);
const INSTALL = readFileSync(resolve(process.cwd(), "docs/GOOD_TROUBLE_WIX_INSTALL_LINKS.md"), "utf8");

describe("Good Trouble browse-first Seeker demo contract", () => {
  it("documents browse demo entry and separates purchase sandbox", () => {
    expect(GOOD_TROUBLE_BROWSE_SEEKER_DEMO.purpose).toBe("browse");
    expect(GOOD_TROUBLE_BROWSE_SEEKER_DEMO.policyId).toBe("good-trouble-browse-v1");
    expect(GOOD_TROUBLE_BROWSE_SEEKER_DEMO.postVerificationPath).toBe("/goods");
    expect(GOOD_TROUBLE_BROWSE_SEEKER_DEMO.purchaseDemoPath).toBe("/good-trouble/checkout");
  });

  it("browse callback shows Verification confirmed and fail-closed restart", () => {
    expect(BROWSE_CALLBACK_LOGIC).toContain("Verification confirmed");
    expect(WIX_CALLBACK).toContain("showRestart");
    expect(WIX_CALLBACK).toContain("resolveBrowsePostVerificationRedirectDestination");
  });

  it("install links include browse callback public modules", () => {
    expect(INSTALL).toContain("browseCallbackLogic.js");
    expect(INSTALL).toContain("browseCallbackCompletion.js");
    expect(INSTALL).toContain("/browse-verification-result");
  });
});
