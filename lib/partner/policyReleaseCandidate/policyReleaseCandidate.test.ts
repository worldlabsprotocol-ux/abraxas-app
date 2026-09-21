import { describe, expect, it } from "vitest";
import {
  POLICY_RC_NOTICE,
  POLICY_RC_STATES,
  policyRcCanTransition,
} from "./contract";
import { deriveReleaseShape, createReleaseOverride, releaseLeaks } from "./sanitize";
import { generateReleaseFixtures } from "./fixtures";
import { buildReleaseSpecification } from "./spec";
import type { SanitizedProposalPayload } from "@/lib/partner/policyProposal/sanitize";

const proposal: SanitizedProposalPayload = {
  action: "retail_access",
  result_needed: "age_21",
  partner_receives: ["eligibility_result"],
  stays_private: ["date_of_birth", "holder_wallet"],
  environment: "sandbox",
  platform: "http_generic",
  capabilities: ["reusable_result"],
};

const body = {
  confirm: true,
  action: "retail_access",
  result_category: "age_21",
  shared_result: ["eligibility_result"],
  withheld: ["date_of_birth", "holder_wallet"],
  method_category: "reuse_existing_proof",
  minimum_assurance: "L1",
  environment: "sandbox",
  action_scopes: ["sandbox:protocol_access"],
  disclosure_profile: "result_only",
  compatibility_impact: "policy_review",
  policy_label: "reviewed_gate_age_21",
};

describe("policy release candidate contract", () => {
  it("keeps an explicit non-live lifecycle", () => {
    expect(POLICY_RC_STATES).toEqual([
      "draft",
      "ready_for_review",
      "needs_revision",
      "approved_for_catalog_pr",
      "superseded",
    ]);
    expect(policyRcCanTransition("draft", "ready_for_review")).toBe(true);
    expect(policyRcCanTransition("ready_for_review", "approved_for_catalog_pr")).toBe(true);
    expect(policyRcCanTransition("approved_for_catalog_pr", "draft")).toBe(false);
    expect(policyRcCanTransition("superseded", "draft")).toBe(false);
  });

  it("allowlists structured fields and rejects authority extras", () => {
    expect(createReleaseOverride(body)).toBe(false);
    expect(createReleaseOverride({ ...body, partner_id: "other" })).toBe(true);
    expect(createReleaseOverride({ ...body, policy_id: "age_21_retail" })).toBe(true);
    expect(createReleaseOverride({ ...body, activate_mainnet: true })).toBe(true);
    expect(createReleaseOverride({ ...body, sql: "drop" })).toBe(true);
    expect(deriveReleaseShape(proposal, { ...body, pack_id: "x" })).toBeNull();
  });

  it("derives a safe shape and deterministic fixtures without minting receipts", () => {
    const shape = deriveReleaseShape(proposal, body);
    expect(shape?.live_policy).toBe(false);
    expect(shape?.publishes_catalog).toBe(false);
    expect(shape?.mutates_compatibility_edge).toBe(false);
    const fixtures = generateReleaseFixtures(shape!);
    expect(fixtures.map((item) => item.invariant)).toEqual([
      "exact_result_allowed",
      "prohibited_data_withheld",
      "minimum_method_assurance",
      "expired_result",
      "revoked_result",
      "denied_result",
      "sandbox_versus_production",
      "receipt_verification",
      "disclosure_serialization",
      "action_contract_scope",
      "compatibility_reuse",
    ]);
    expect(fixtures.every((item) => item.must_not.includes("mint_receipt") || item.must_not.length > 0)).toBe(true);
    expect(generateReleaseFixtures(shape!).map((item) => item.id)).toEqual(fixtures.map((item) => item.id));
    const spec = buildReleaseSpecification(shape!);
    expect(spec.copyable).toContain("separately reviewed source-code PR");
    expect(spec.copyable).toContain(POLICY_RC_NOTICE);
    expect(spec.checklist).toContain("catalog pack/version change");
    expect(releaseLeaks({ shape, spec, fixtures })).toEqual([]);
  });
});
