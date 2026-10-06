// FILE: lib/product/holderRequestPresentation.test.ts

import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";
import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";

describe("buildHolderRequestPresentation", () => {
  it("derives Good Trouble age-21 holder copy from canonical policy presentation", () => {
    const copy = buildHolderRequestPresentation("Good Trouble", GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(copy.requestHeadline).toContain("Good Trouble wants to confirm");
    expect(copy.requestHeadline.toLowerCase()).toContain("age 21");
    expect(copy.completionHeadline).toContain("Good Trouble can now confirm");
    expect(copy.sharedResult[0]?.label.toLowerCase()).toContain("21");
    expect(copy.withheld.some((item) => /date of birth|birth/i.test(item.label))).toBe(true);
  });

  it("falls back safely for unknown policies", () => {
    const copy = buildHolderRequestPresentation("Example Partner", "unknown-policy-v1", {
      requestedAction: "purchase_check",
    });
    expect(copy.requestHeadline).toContain("Example Partner");
    expect(copy.requested[0]?.label).toContain("purchase check");
  });
});
