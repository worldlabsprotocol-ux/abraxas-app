// FILE: lib/partner/executionContracts/executionContracts.test.ts

import { describe, expect, it } from "vitest";
import { assertLaunchpadStarterKitContractIntegrity, EXECUTION_CONTRACTS } from "./registry";
import { buildLaunchpadStarterKitRequestBody } from "@/lib/partner/starterKit/launchpadClientRequest";
import { prepareLaunchpadStarterKitBody } from "@/lib/partner/starterKit/prepareLaunchpadStarterKitBody";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { buildLaunchpadTestScenarioRequestBody } from "@/lib/partner/launchpad/testScenarioClientRequest";
import { rejectUnknownJsonKeys } from "@/lib/http/strictJsonBody";

describe("execution contract registry", () => {
  it("registers launchpad starter kit and harness contracts", () => {
    expect(EXECUTION_CONTRACTS.map((c) => c.id)).toContain("launchpad_starter_kit");
    expect(EXECUTION_CONTRACTS.map((c) => c.id)).toContain("launchpad_test_harness");
  });

  it("passes launchpad starter kit integrity checks (Build 888 regression)", () => {
    expect(assertLaunchpadStarterKitContractIntegrity()).toEqual([]);
  });

  it("canonical client builder matches server validation path", () => {
    const body = buildLaunchpadStarterKitRequestBody({
      bindingId: "primary:app-1",
      path: "hosted_partner_flow",
      platform: "wix_velo",
      capabilities: [],
    });
    const prepared = prepareLaunchpadStarterKitBody(body, "wallet_control");
    expect(validateStarterKitInput(prepared).ok).toBe(true);
  });

  it("rejects harness bodies with unknown fields", () => {
    const body = buildLaunchpadTestScenarioRequestBody({
      scenarioId: "approved",
      returnUrl: "http://localhost:3000/callback",
    });
    expect(rejectUnknownJsonKeys(body, ["scenario_id", "return_url"]).ok).toBe(true);
    expect(
      rejectUnknownJsonKeys({ ...body, forged_partner_id: "evil" }, ["scenario_id", "return_url"]).code,
    ).toBe("unknown_field");
  });
});
