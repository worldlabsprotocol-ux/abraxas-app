import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_PROTOCOL_VISUAL_ASSETS } from "./homepageProtocolVisualAssets";

const ROOT = resolve(__dirname, "../..");

describe("homepage protocol visual assets", () => {
  it("ships optimized webp for each homepage exhibit", () => {
    for (const rel of Object.values(HOMEPAGE_PROTOCOL_VISUAL_ASSETS)) {
      const path = resolve(ROOT, "public", rel.replace(/^\//, ""));
      expect(existsSync(path), `missing ${rel}`).toBe(true);
    }
  });
});
