// FILE: lib/home/defiVisualHomeCopy.test.ts

import { describe, expect, it } from "vitest";
import { DEFI_HOME_HEADLINE, DEFI_TRUST_GLASS_MODULES } from "@/lib/home/defiVisualHomeCopy";

describe("defiVisualHomeCopy", () => {
  it("keeps hero copy concise", () => {
    expect(DEFI_HOME_HEADLINE.length).toBeLessThan(60);
    expect(DEFI_TRUST_GLASS_MODULES.length).toBe(4);
  });
});
