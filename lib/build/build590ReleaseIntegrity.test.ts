// FILE: lib/build/build590ReleaseIntegrity.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("Build #590 release integrity wiring", () => {
  it("defines compile and validation npm scripts", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["build:compile"]).toMatch(/ABRAXAS_SKIP_IN_BUILD_VALIDATION=1/);
    expect(pkg.scripts["validate:typescript"]).toContain("tsconfig.validation.json");
    expect(pkg.scripts["validate:eslint"]).toBe("next lint");
  });

  it("routes Vercel through compile-only build", () => {
    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      buildCommand: string;
    };
    expect(vercel.buildCommand).toBe("npm run build:vercel");
  });

  it("gates CI build on blocking validation jobs", () => {
    const ci = readFileSync(resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("typescript-validation:");
    expect(ci).toContain("eslint-validation:");
    expect(ci).toContain("npm run validate:typescript");
    expect(ci).toMatch(/eslint-validation:[\s\S]*npm run build/);
    expect(ci).toContain("npm run build:compile");
    expect(ci).not.toMatch(/Type check[\s\S]*continue-on-error: true/);
  });

  it("uses explicit skip flag in next.config (not VERCEL_ENV preview hack)", () => {
    const cfg = readFileSync(resolve(process.cwd(), "next.config.js"), "utf8");
    expect(cfg).toContain("ABRAXAS_SKIP_IN_BUILD_VALIDATION");
    expect(cfg).not.toContain('VERCEL_ENV === "preview"');
  });
});
