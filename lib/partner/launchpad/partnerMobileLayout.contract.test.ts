// FILE: lib/partner/launchpad/partnerMobileLayout.contract.test.ts
// Regression: partner / launchpad mobile layout utilities stay in global CSS.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("partner mobile layout CSS contract", () => {
  it("contains page-level horizontal clip and partner surface button wrapping", () => {
    expect(GLOBALS).toContain(".abx-page-content");
    expect(GLOBALS).toContain("overflow-x: clip");
    expect(GLOBALS).toContain(".abx-partner-surface");
    expect(GLOBALS).toContain(".abx-launchpad-url-row");
    expect(GLOBALS).toContain(".abx-responsive-dl");
    expect(GLOBALS).toContain("minmax(min(100%, 220px), 1fr)");
  });

  it("stacks verification path steps on narrow viewports", () => {
    expect(GLOBALS).toMatch(/@media \(max-width: 480px\)[\s\S]*\.abx-verification-path__step/);
  });
});
