// FILE: lib/passport/build572.stagingExecution.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Build #572 staging execution handoff", () => {
  it("documents staging execution boundaries and evidence chain", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/build572-sovereign-passport-staging-execution.md"),
      "utf8",
    );
    expect(doc).toContain("disposable");
    expect(doc).toContain("activation_ready");
    expect(doc).toContain("Do not treat");
    expect(doc).not.toMatch(/—|–/);
  });

  it("includes institutional pilot staging handoff", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/partner-handoff/institutional-pilot-staging-572.md"),
      "utf8",
    );
    expect(doc).toContain("independently verifies");
    expect(doc).toMatch(/does\s+\*\*not\*\*\s+claim/i);
    expect(doc).not.toMatch(/—|–/);
  });

  it("references independent verifier without Abraxas identity DB", () => {
    const readme = readFileSync(
      join(process.cwd(), "docs/partner-handoff/passport-independent-verifier/README.md"),
      "utf8",
    );
    expect(readme.toLowerCase()).toMatch(/identity|database|abraxas/);
  });
});
