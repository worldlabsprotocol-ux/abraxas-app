import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LIVING_SPHERE_BRAND } from "./livingSphereBrandAssets";

describe("livingSphereBrandAssets", () => {
  it("maps hero and nav artwork to disk", () => {
    for (const key of ["hero", "nav"] as const) {
      const path = resolve(process.cwd(), "public", LIVING_SPHERE_BRAND[key].src.replace(/^\//, ""));
      expect(existsSync(path), LIVING_SPHERE_BRAND[key].src).toBe(true);
    }
  });
});
