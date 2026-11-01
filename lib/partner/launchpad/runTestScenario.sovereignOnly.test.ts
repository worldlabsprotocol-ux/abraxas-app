import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/partner/launchpad/launchpadPersistence", () => ({
  launchpadUsesSovereignPostgres: () => false,
}));
vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationForPartner: vi.fn(() => {
    throw new Error("legacy application store must not be read");
  }),
  validateLaunchpadHostedReturnUrl: vi.fn(),
}));

import { runLaunchpadTestScenario } from "./runTestScenario";

describe("sandbox harness sovereign storage boundary", () => {
  it("fails closed before issuing or reading an application on the legacy backend", async () => {
    const result = await runLaunchpadTestScenario({
      applicationId: "00000000-0000-0000-0000-000000000001",
      partnerId: "partner-acme",
      scenarioId: "approved",
    });
    expect(result).toEqual({ ok: false, code: "receipt_unavailable" });
  });
});

