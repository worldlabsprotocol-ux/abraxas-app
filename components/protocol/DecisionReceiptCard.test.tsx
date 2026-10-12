// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DecisionReceiptCard } from "@/components/protocol/DecisionReceiptCard";
import { buildDecisionReceiptDisplayModel } from "@/lib/protocol/decisionReceiptDisplay";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import { RECEIPT_ADVANCED_TOGGLE } from "@/lib/product/receiptPlainLanguage";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

afterEach(() => cleanup());

function sampleReceipt(overrides: Partial<DecisionReceiptPublicView> = {}): DecisionReceiptPublicView {
  return {
    receipt_id: "dr_card_test",
    schema_version: "1.0.0",
    policy_id: "partner-age_21_retail-v1",
    policy_version: 1,
    partner_id: "good-trouble",
    subject_pseudonym_id: "subj_abc",
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    production_usable: true,
    evaluated_at: "2026-09-30T12:00:00.000Z",
    expires_at: "2099-10-01T12:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "key_primary",
    signature_valid: true,
    anchor_reference: null,
    artifact_type: "eligibility_decision_receipt",
    currently_valid: true,
    lifecycle_status: "active",
    partner_safe_reason: null,
    ...overrides,
  };
}

describe("DecisionReceiptCard", () => {
  it("exposes accessible advanced-details toggle using receipt plain-language label", () => {
    const model = buildDecisionReceiptDisplayModel(sampleReceipt(), { actionPermitted: true });
    render(<DecisionReceiptCard model={model} />);

    const toggle = screen.getByRole("button", { name: RECEIPT_ADVANCED_TOGGLE });
    expect(toggle.getAttribute("type")).toBe("button");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Hide details")).toBeTruthy();
    expect(screen.getByTitle("Receipt ID").textContent).toBe("dr_card_test");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTitle("Receipt ID")).toBeNull();
  });

  it("does not show chain proof in summary until proof is confirmed", () => {
    const model = buildDecisionReceiptDisplayModel(
      sampleReceipt({
        solana_provenance: {
          status: "submitted",
          proof_confirmed: false,
          transaction_signature: "sig_pending",
        },
      } as DecisionReceiptPublicView),
      { actionPermitted: true },
    );
    render(<DecisionReceiptCard model={model} />);

    expect(screen.queryByText("Chain proof")).toBeNull();
    expect(screen.getByText(/On-chain confirmation is still pending/i)).toBeTruthy();
  });
});
