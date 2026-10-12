import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { OFFICIAL_BRAND_ASSETS } from "@/lib/brand/officialBrandAssets";

describe("officialBrandAssets", () => {
  it("maps to founder-provided files on disk", () => {
    for (const asset of Object.values(OFFICIAL_BRAND_ASSETS)) {
      const path = resolve(process.cwd(), "public", asset.src.replace(/^\//, ""));
      expect(existsSync(path), asset.src).toBe(true);
    }
  });
});
