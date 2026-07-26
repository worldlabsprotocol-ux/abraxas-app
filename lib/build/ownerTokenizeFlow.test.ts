import { describe, expect, it } from "vitest";
import { OWNER_ASSET_OPTIONS, tokenizeStepLabel } from "./ownerTokenizeFlow";

describe("ownerTokenizeFlow", () => {
  it("offers five everyday asset categories", () => {
    expect(OWNER_ASSET_OPTIONS).toHaveLength(5);
    expect(OWNER_ASSET_OPTIONS.map(o => o.id)).toContain("real_estate");
  });

  it("labels wizard steps in plain language", () => {
    expect(tokenizeStepLabel("pick")).toBe("What you own");
    expect(tokenizeStepLabel("done")).toBe("Done");
  });
});
