import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("Good Trouble pilot host continuity", () => {
  it("keeps the browser checkout verification on the current host", () => {
    const source = readFileSync(
      join(ROOT, "components/goodTrouble/GoodTroubleRetailCheckoutCTA.tsx"),
      "utf8",
    );
    expect(source).toContain("goodTroubleVerifyUrl()");
    expect(source).toContain("goodTroubleReturnUrl()");
    expect(source).not.toContain("goodTroubleProductionVerifyUrl()");
    expect(source).not.toContain("goodTroubleProductionReturnUrl()");
  });

  it("routes failed callback retries through the same-host checkout", () => {
    const source = readFileSync(join(ROOT, "app/good-trouble/enter/page.tsx"), "utf8");
    expect(source).toContain('verifyPath="/good-trouble/checkout"');
    expect(source).not.toContain("goodTroubleProductionVerifyUrl");
  });
});
