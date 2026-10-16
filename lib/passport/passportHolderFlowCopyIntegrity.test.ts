// FILE: lib/passport/passportHolderFlowCopyIntegrity.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("Passport holder flow copy integrity", () => {
  const motionSrc = readFileSync(
    resolve(process.cwd(), "components/protocol-visuals/PassportHolderFlowStepsMotion.tsx"),
    "utf8",
  );
  const visualSrc = readFileSync(
    resolve(process.cwd(), "components/protocol-visuals/PassportHolderFlowVisual.tsx"),
    "utf8",
  );

  it("does not claim device-only credential storage or frictionless cross-app authorization", () => {
    expect(motionSrc.toLowerCase()).not.toContain("same proof, new app");
    expect(motionSrc.toLowerCase()).not.toMatch(/credentials stay with you/);
    expect(motionSrc.toLowerCase()).not.toContain("only on your device");
    expect(visualSrc).toMatch(/never automatic access across unrelated apps/i);
  });

  it("states consent, policy, freshness, and revocation for reuse", () => {
    expect(motionSrc).toMatch(/consent/i);
    expect(motionSrc).toMatch(/policy/i);
    expect(motionSrc).toMatch(/revocation/i);
    expect(motionSrc).toMatch(/fresh/i);
  });
});
