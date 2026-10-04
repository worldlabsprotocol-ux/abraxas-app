// FILE: lib/build/nextConfigWebpack.test.ts
// Regression: viem must not be aliased to false in server webpack bundles.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("next.config webpack viem guard", () => {
  it("aliases viem to false only in the client branch", () => {
    const source = readFileSync(resolve(process.cwd(), "next.config.js"), "utf8");
    const serverBlock = source.split("if (isServer) {")[1]?.split("} else {")[0] ?? "";
    const clientBlock = source.split("} else {")[1]?.split("return config")[0] ?? "";

    expect(clientBlock).toContain('"viem": false');
    expect(serverBlock).not.toContain('"viem": false');
    expect(serverBlock).not.toContain('"wagmi": false');
  });
});
