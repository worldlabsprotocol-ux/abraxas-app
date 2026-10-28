import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel 8GB build memory guards", () => {
  it("next.config limits parallel compile and static generation on Vercel", () => {
    const source = readFileSync(join(process.cwd(), "next.config.js"), "utf8");
    expect(source).toMatch(/vercelBuild\s*=\s*process\.env\.VERCEL\s*===\s*"1"/);
    expect(source).toMatch(/parallelServerCompiles:\s*vercelBuild\s*\?\s*false/);
    expect(source).toMatch(/parallelServerBuildTraces:\s*vercelBuild\s*\?\s*false/);
    expect(source).toMatch(/staticGenerationMaxConcurrency:\s*vercelBuild\s*\?\s*1/);
    expect(source).toMatch(/webpackBuildWorker:\s*vercelBuild\s*\?\s*false/);
    expect(source).toMatch(/config\.parallelism\s*=\s*1/);
  });

  it("build:vercel skips in-build lint/types (CI owns validation)", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["build:vercel"]).toContain("ABRAXAS_SKIP_IN_BUILD_VALIDATION=1");
    expect(pkg.scripts["build:vercel"]).toContain("--no-lint");
  });

  it("does not install unused wallet-adapter-wallets meta-package", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@solana/wallet-adapter-wallets"]).toBeUndefined();
  });

  it("declares zod for supported BAG API validation (direct import, not transitive-only)", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies.zod).toBeTruthy();
  });
});
