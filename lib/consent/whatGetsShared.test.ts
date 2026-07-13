import { describe, expect, it } from "vitest";
import { buildWhatGetsSharedCopy, plainClaimLabels } from "./whatGetsShared";

describe("whatGetsShared", () => {
  it("builds plain partner line from claim labels", () => {
    const copy = buildWhatGetsSharedCopy({
      partnerName: "Cielo",
      sharedLabels: plainClaimLabels(["wallet_binding_confirmed", "guest_eligibility"]),
    });
    expect(copy.needsLine).toContain("Cielo needs to know");
    expect(copy.needsLine).toContain("you control this wallet");
    expect(copy.notSharedLine).toContain("ID photos");
  });

  it("uses fallback when no claims listed", () => {
    const copy = buildWhatGetsSharedCopy({
      partnerName: "Demo Partner",
      sharedLabels: [],
    });
    expect(copy.needsLine).toContain("Trust Rules");
  });
});
