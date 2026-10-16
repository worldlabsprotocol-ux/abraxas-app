// FILE: lib/home/defiVisualHomeCopy.test.ts

import { describe, expect, it } from "vitest";
import { DEFI_HOME_HEADLINE, DEFI_TRUST_GLASS_MODULES, DEFI_TRUST_PIPELINE } from "@/lib/home/defiVisualHomeCopy";

describe("defiVisualHomeCopy", () => {
  it("keeps hero copy concise", () => {
    expect(DEFI_HOME_HEADLINE.length).toBeLessThan(60);
    expect(DEFI_TRUST_GLASS_MODULES.length).toBe(4);
  });

  it("describes pipeline without implying a live receipt was issued", () => {
    const decision = DEFI_TRUST_PIPELINE.find((s) => s.id === "decision");
    expect(decision?.short.toLowerCase()).not.toContain("receipt issued");
    expect(DEFI_TRUST_PIPELINE.some((s) => s.label === "Independent verification")).toBe(true);
  });
});
