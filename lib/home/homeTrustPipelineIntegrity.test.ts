// FILE: lib/home/homeTrustPipelineIntegrity.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("homepage trust pipeline integrity", () => {
  it("does not render non-functional button controls in the pipeline strip", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/home/defi/HomeTrustPipelineStrip.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/<button\b/);
    expect(src).toContain("abx-trust-pipeline__node-card");
  });
});
