// FILE: lib/authenticationProof/runE2eVerificationCheck.test.ts

import { describe, expect, it } from "vitest";
import { runE2eVerificationCheck } from "./runE2eVerificationCheck";

describe("runE2eVerificationCheck", () => {
  it("runs production reference path with test keys when signing not configured", async () => {
    const prev = process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;

    const result = await runE2eVerificationCheck();

    expect(result.steps.length).toBeGreaterThanOrEqual(4);
    expect(result.production_reference?.asset_id).toBe("ABX-RE-HOSP-001");
    expect(result.agent_flow).toHaveLength(3);

    if (prev) process.env.ABRAXAS_SIGNING_KEY = prev;
  });
});
