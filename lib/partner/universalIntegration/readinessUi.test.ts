import { describe, expect, it } from "vitest";
import { deriveUniversalIntegrationReadiness } from "./readinessDiagnostic";
import { readinessNextActions, describeReadinessPhase } from "./readinessUi";

describe("readiness UI helpers", () => {
  it("never suggests production from sandbox_verified alone", () => {
    const diag = deriveUniversalIntegrationReadiness({
      application: {
        status: "active",
        environment: "sandbox",
        policy_id: "p-v1",
        policy_version: 1,
        allowed_return_urls: ["https://app.example/cb"],
        production_api_key_id: null,
        production_activated_at: null,
      },
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedReceiptCount: 2,
      harnessPassed: true,
      productionAccessRequestStatus: null,
      integrationHealthOverall: "action_required",
    });
    expect(diag.phase).toBe("sandbox_verified");
    const actions = readinessNextActions(diag).join(" ");
    expect(actions).not.toMatch(/production credential/i);
    expect(describeReadinessPhase(diag.phase)).toContain("Sandbox verified");
  });
});
