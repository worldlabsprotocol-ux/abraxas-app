import { describe, expect, it } from "vitest";
import { runBuild976LocalAcceptance } from "./build976LocalAcceptance";

const enabled = process.env.ABRAXAS_BUILD976_LOCAL_ACCEPTANCE === "1";

describe.skipIf(!enabled)("BUILD #976 local acceptance", () => {
  it("prepares, signs, confirms against local validator, and revalidates trust", async () => {
    const artifact = await runBuild976LocalAcceptance();
    expect(artifact.receipt_id).toMatch(/^dr_/);
    expect(artifact.transaction_signature.length).toBeGreaterThan(20);
    expect(artifact.observation_slot).toBeGreaterThan(0);
    expect(artifact.independent_verification_fully_accepts).toBe(true);
  }, 300_000);
});