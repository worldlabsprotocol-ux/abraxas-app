import { describe, expect, it } from "vitest";

describe("blockchain-native confirm cache revalidation", () => {
  it("always re-runs live verification instead of returning cached portable results", async () => {
    const studio = await import("./studioExecution");
    const src = studio.confirmBlockchainNativeStudioExecution.toString();
    expect(src).not.toContain("if (cached) return cached");
    expect(src).toContain("verifyBlockchainNativeExecutionBundle");
  });
});