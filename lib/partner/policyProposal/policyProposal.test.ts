import { describe, expect, it } from "vitest";
import {
  POLICY_PROPOSAL_NOTICE,
  POLICY_PROPOSAL_STATES,
  policyProposalPublicChoices,
} from "./contract";
import {
  buildPlanningRecord,
  partnerProposalOverride,
  operatorProposalOverride,
  proposalLeaks,
  sanitizeProposalPayload,
} from "./sanitize";

const valid = {
  action: "retail_access",
  result_needed: "age_21",
  partner_receives: ["eligibility_result"],
  stays_private: ["date_of_birth", "holder_wallet"],
  environment: "sandbox",
  platform: "http_generic",
  capabilities: ["reusable_result"],
  confirm: true,
};

describe("policy proposal contract", () => {
  it("keeps structured choices and never claims a live policy", () => {
    const choices = policyProposalPublicChoices();
    expect(choices.notice).toBe(POLICY_PROPOSAL_NOTICE);
    expect(POLICY_PROPOSAL_STATES).toEqual([
      "draft",
      "submitted",
      "needs_information",
      "under_review",
      "accepted_for_policy_work",
      "declined",
    ]);
    expect(choices.stays_private.some((item) => item.id === "holder_wallet")).toBe(true);
  });

  it("sanitizes valid payloads and rejects extra or authority fields", () => {
    expect(sanitizeProposalPayload(valid)).toMatchObject({
      action: "retail_access",
      result_needed: "age_21",
    });
    expect(partnerProposalOverride({ ...valid, partner_id: "other" })).toBe(true);
    expect(partnerProposalOverride({ ...valid, receipt: "rct_1" })).toBe(true);
    expect(partnerProposalOverride({ ...valid, activate_mainnet: true })).toBe(true);
    expect(partnerProposalOverride({ ...valid, callback_url: "https://evil" })).toBe(true);
    expect(sanitizeProposalPayload({ ...valid, extra: "no" })).toBeNull();
    expect(operatorProposalOverride({ status: "declined", confirm: true, policy_id: "x" })).toBe(true);
    expect(operatorProposalOverride({ status: "accepted_for_policy_work", confirm: true })).toBe(false);
  });

  it("builds a planning record that cannot publish catalog or mutate edges", () => {
    const payload = sanitizeProposalPayload(valid);
    expect(payload).not.toBeNull();
    const planning = buildPlanningRecord(payload!);
    expect(planning.live_policy).toBe(false);
    expect(planning.publishes_catalog).toBe(false);
    expect(planning.mutates_compatibility_edge).toBe(false);
    expect(planning.proposed_version_class).toBe("unassigned");
    expect(planning.compatibility_class).toBe("review_required");
  });

  it("accepts KYC/KYB planning result categories without creating a live policy", () => {
    const payload = sanitizeProposalPayload({
      ...valid,
      result_needed: "authorized_signer",
    });
    expect(payload?.result_needed).toBe("authorized_signer");
    const choices = policyProposalPublicChoices();
    expect(choices.results.some((item) => item.id === "organization_eligible")).toBe(true);
  });

  it("detects leaks without treating structured privacy choices as secrets", () => {
    expect(proposalLeaks({ payload: sanitizeProposalPayload(valid), proposal_ref: "ppr_abc" })).toEqual([]);
    expect(proposalLeaks({ receipt_id: "rct_1", wallet_address: "0xabc" })).toContain("receipt_id");
    expect(proposalLeaks({ callback_url: "https://x" })).toContain("callback_url");
    expect(proposalLeaks({ key: "abx_live_secret" })).toContain("abx_live_");
  });
});
