/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PartnerSandboxCallbackClient } from "./PartnerSandboxCallbackClient";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";

const receipt: DecisionReceiptPublicView = {
  receipt_id: "dr_ui_test",
  schema_version: "1.0.0",
  policy_id: "p-wallet_control-v1",
  policy_version: 1,
  partner_id: "studio-test",
  decision_result: "approved",
  reason_codes: [],
  evaluated_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  status: "active",
  signature_valid: true,
  currently_valid: true,
  production_usable: false,
  decision_context: "sandbox_only",
  artifact_type: "eligibility_decision_receipt",
};

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      "status=approved&receipt_id=dr_ui_test&partner_id=studio-test&policy_id=p-wallet_control-v1",
    ),
}));

vi.mock("@/components/protocol/LiveDecisionReceiptCard", () => ({
  LiveDecisionReceiptCard: () => <div data-testid="live-receipt-card">receipt</div>,
}));

describe("PartnerSandboxCallbackClient layout", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(receipt),
      ),
    );
  });

  it("keeps status, actions, and verification details in one result card", async () => {
    render(<PartnerSandboxCallbackClient />);

    await waitFor(() => {
      expect(screen.getByText("Verification complete")).toBeTruthy();
    });

    const card = document.querySelector(".abx-partner-sandbox-callback__card");
    expect(card).toBeTruthy();
    expect(card?.querySelector(".abx-partner-sandbox-callback__status-dl")).toBeTruthy();
    expect(card?.querySelector(".abx-partner-sandbox-callback__actions")).toBeTruthy();
    expect(card?.querySelector(".abx-partner-sandbox-callback__details")).toBeTruthy();
  });

  it("shows sandbox environment note once for sandbox_only receipts", async () => {
    render(<PartnerSandboxCallbackClient />);

    await waitFor(() => {
      expect(screen.getByText("Verification complete")).toBeTruthy();
    });

    expect(document.querySelectorAll(".abx-partner-sandbox-callback__sandbox-note")).toHaveLength(1);
  });
});
