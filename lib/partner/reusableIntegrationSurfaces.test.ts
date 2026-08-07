import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const STALE_GT = "good-trouble-cannabis";
const STALE_GT_POLICY = "good-trouble-retail-v1";

const REUSABLE_SURFACES = [
  "lib/partner/referenceRelyingPartyConfig.ts",
  "lib/partner/partnerConformanceHarness.ts",
  "lib/partner/partnerConformanceFixtures.ts",
  "lib/partner/partnerConformanceConfig.ts",
  "examples/partner-flow-web-rp/reference-config.mjs",
  "examples/partner-flow-web-rp/build-verify-url.mjs",
  "examples/partner-flow-web-rp/verify-callback.mjs",
  "examples/partner-access-nextjs-starter/lib/config.ts",
  "examples/partner-access-nextjs-starter/lib/callbackParams.ts",
  "examples/partner-access-nextjs-starter/lib/session.ts",
  "examples/partner-access-nextjs-starter/lib/verifyReceipt.ts",
];

describe("reusable partner integration surfaces avoid Good Trouble hardcoding", () => {
  for (const relativePath of REUSABLE_SURFACES) {
    it(`${relativePath} does not hardcode Good Trouble pilot ids`, () => {
      const content = readFileSync(join(ROOT, relativePath), "utf8");
      expect(content).not.toContain(STALE_GT);
      expect(content).not.toContain(STALE_GT_POLICY);
      expect(content).not.toContain("/good-trouble/enter");
      expect(content).not.toMatch(/from ["']@\/lib\/goodTrouble/);
    });
  }
});

describe("Good Trouble pilot example is explicitly labeled", () => {
  it("pilot example module documents Good Trouble as pilot-only reference", () => {
    const content = readFileSync(join(ROOT, "lib/goodTrouble/pilotExample.ts"), "utf8");
    expect(content).toContain("pilot");
    expect(content).toContain("GOOD_TROUBLE_PILOT_EXAMPLE");
    expect(content).toContain("not a generic integration template");
  });
});
