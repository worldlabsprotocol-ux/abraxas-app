import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LIVING_SPHERE_BRAND } from "./livingSphereBrandAssets";

describe("livingSphereBrandAssets", () => {
  it("maps hero artwork to disk", () => {
    const path = resolve(process.cwd(), "public", LIVING_SPHERE_BRAND.hero.src.replace(/^\//, ""));
    expect(existsSync(path)).toBe(true);
  });
});
