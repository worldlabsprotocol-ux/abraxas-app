// FILE: lib/partner/executionContracts/executionContracts.test.ts

import { describe, expect, it } from "vitest";
import {
  assertExecutionContractRegistryIntegrity,
  assertLaunchpadStarterKitContractIntegrity,
  EXECUTION_CONTRACTS,
} from "./registry";
import { buildLaunchpadStarterKitRequestBody } from "@/lib/partner/starterKit/launchpadClientRequest";
import { prepareLaunchpadStarterKitBody } from "@/lib/partner/starterKit/prepareLaunchpadStarterKitBody";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { buildLaunchpadTestScenarioRequestBody } from "@/lib/partner/launchpad/testScenarioClientRequest";
import { buildPartnerHandoffCreateRequestBody } from "@/lib/partner/hostedHandoff/handoffClientRequest";
import { buildWalletActionChallengeRequestBody } from "@/lib/auth/ephemeralWallet/walletActionChallengeClientRequest";
import { rejectUnknownJsonKeys } from "@/lib/http/strictJsonBody";

describe("execution contract registry", () => {
  it("registers Build 890 trust boundaries", () => {
    const ids = EXECUTION_CONTRACTS.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "launchpad_starter_kit",
        "launchpad_test_harness",
        "partner_handoff_create",
        "wallet_action_challenge",
        "sandbox_receipt_validate",
        "institutional_mandate_enforcement",
        "portable_receipt_verification",
      ]),
    );
  });

  it("passes full registry static integrity (Build 890)", () => {
    expect(assertExecutionContractRegistryIntegrity()).toEqual([]);
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

  it("partner handoff and wallet challenge builders stay within allowed keys", () => {
    const handoff = buildPartnerHandoffCreateRequestBody({ bindingId: "b1" });
    expect(rejectUnknownJsonKeys(handoff, ["runtime", "binding_id"]).ok).toBe(true);
    const wallet = buildWalletActionChallengeRequestBody({
      operation: "sandbox:enter",
      resource: "abraxas:sandbox:ws:policy:wallet_control",
      policyId: "wallet_control",
    });
    expect(rejectUnknownJsonKeys(wallet, ["operation", "resource", "policy_id", "solana_network"]).ok).toBe(true);
  });
});
