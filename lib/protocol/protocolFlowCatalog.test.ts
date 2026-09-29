import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROTOCOL_POLICY,
  PROTOCOL_FLOW_POLICIES,
  PROTOCOL_FLOW_STEPS,
  resolveProtocolFlowPolicy,
} from "@/lib/protocol/protocolFlowCatalog";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";

describe("protocolFlowCatalog", () => {
  it("defaults to age_21_retail", () => {
    expect(DEFAULT_PROTOCOL_POLICY.id).toBe("age_21_retail");
  });

  it("derives disclosed results from policy packs", () => {
    for (const view of PROTOCOL_FLOW_POLICIES) {
      const pack = POLICY_PACKS[view.id];
      expect(view.disclosedResult).toBe(pack.disclosed_result);
      expect(view.protectedFields.length).toBeGreaterThan(0);
    }
  });

  it("exposes the full Abraxas protocol step sequence", () => {
    expect(PROTOCOL_FLOW_STEPS.map((s) => s.id)).toEqual([
      "request",
      "consent",
      "evidence",
      "evaluate",
      "disclose",
      "sign",
      "verify",
      "reuse",
    ]);
  });

  it("resolves arbitrary catalog pack ids", () => {
    const residency = resolveProtocolFlowPolicy("residency_us");
    expect(residency.disclosedResult).toBe("residency_check_passed");
  });
});
