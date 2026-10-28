// FILE: lib/product/abraxasGuideContent.test.ts

import { describe, expect, it } from "vitest";
import { filterAbraxasGuideEntries } from "./abraxasGuideContent";

describe("Abraxas Guide content", () => {
  it("filters entries by search query", () => {
    const all = filterAbraxasGuideEntries("");
    expect(all.length).toBeGreaterThan(3);
    const proof = filterAbraxasGuideEntries("proof");
    expect(proof.some((e) => e.id === "check-proof")).toBe(true);
    expect(filterAbraxasGuideEntries("zzznomatch")).toHaveLength(0);
  });
});
