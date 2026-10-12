import { describe, expect, it } from "vitest";
import { MONO } from "@/lib/design/monochromeSystem";
import { ABX_V2 } from "@/lib/design/institutionalV2Tokens";

describe("monochromeSystem", () => {
  it("maps institutional V2 tokens to monochrome foundation", () => {
    expect(ABX_V2.graphite).toBe(MONO.bgPrimary);
    expect(ABX_V2.charcoal).toBe(MONO.bgSecondary);
    expect(ABX_V2.surface).toBe(MONO.surfaceElevated);
  });
});
