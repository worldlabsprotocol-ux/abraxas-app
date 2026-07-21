// FILE: lib/productVisualDemo.test.ts

import { describe, expect, it } from "vitest";
import {
  DASHBOARD_ASSETS,
  PASSPORT_VISUAL_STEPS,
  PRODUCT_DEMO_FLOWS,
  UNLOCK_VISUAL_STEPS,
} from "./productVisualDemo";

describe("productVisualDemo", () => {
  it("defines three product flows", () => {
    expect(PRODUCT_DEMO_FLOWS).toHaveLength(3);
    expect(PRODUCT_DEMO_FLOWS.map(f => f.id)).toEqual(["passport", "unlock", "dashboard"]);
  });

  it("has minimal passport steps", () => {
    expect(PASSPORT_VISUAL_STEPS).toHaveLength(3);
    expect(PASSPORT_VISUAL_STEPS[2].label).toBe("Passport");
  });

  it("uses real asset labels in dashboard", () => {
    expect(DASHBOARD_ASSETS[0].name).toBe("Cielo Sunrise");
    expect(UNLOCK_VISUAL_STEPS).toHaveLength(3);
  });
});
