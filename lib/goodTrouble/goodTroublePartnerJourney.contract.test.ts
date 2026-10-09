// FILE: lib/goodTrouble/goodTroublePartnerJourney.contract.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_EXPECTED_CALLBACK_URL } from "@/lib/goodTrouble/canonicalProductionConfig";

const WIX_PUBLIC = resolve(process.cwd(), "examples/good-trouble-wix/public/abraxasClientConstants.js");
const INSTALL = readFileSync(resolve(process.cwd(), "docs/GOOD_TROUBLE_WIX_INSTALL_LINKS.md"), "utf8");

describe("Good Trouble partner journey contract", () => {
  it("uses canonical Abraxas callback allowlist path", () => {
    expect(GOOD_TROUBLE_EXPECTED_CALLBACK_URL).toBe(
      "https://www.goodtroublecanna.com/age-verification-result",
    );
  });

  it("documents The Goods post-verification slug", () => {
    const constants = readFileSync(WIX_PUBLIC, "utf8");
    expect(constants).toContain('GOOD_TROUBLE_THE_GOODS_SHOP_PATH = "/goods"');
    expect(INSTALL).toContain("/goods");
    expect(INSTALL).toContain("public/ageGateAccessState.js");
  });
});
