// FILE: lib/positioningLoop.test.ts

import { describe, expect, it } from "vitest";
import { ASSET_POSITIONING_STEPS } from "@/lib/assetPositioning";

describe("positioningLoop", () => {
  it("maps three positioning steps for closed-loop narrative", () => {
    expect(ASSET_POSITIONING_STEPS).toHaveLength(3);
    expect(ASSET_POSITIONING_STEPS[0].href).toBe("/build");
    expect(ASSET_POSITIONING_STEPS[2].href).toBe("/integrate");
  });
});
