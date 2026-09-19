import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OBSOLETE_JUDGE_DEMO_ENV_NAMES } from "@/lib/judgeDemo/contract";

describe("retired judge-demo module", () => {
  it("only documents obsolete env names and does not evaluate a judge flag", () => {
    expect(OBSOLETE_JUDGE_DEMO_ENV_NAMES).toEqual([
      "ABRAXAS_JUDGE_DEMO",
      "NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO",
    ]);
    const src = readFileSync(join(__dirname, "contract.ts"), "utf8");
    expect(src).not.toContain("isJudgeDemoRequested");
    expect(src).not.toContain("circle_submit_allowed: false");
  });
});
