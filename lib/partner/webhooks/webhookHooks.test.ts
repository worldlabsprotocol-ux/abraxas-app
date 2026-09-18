import { describe, expect, it, vi } from "vitest";
import { maybeEnqueuePartnerReceiptIssued } from "@/lib/partner/webhooks/webhookHooks";

const enqueueMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  enqueuePartnerWebhookEventBestEffort: (...args: unknown[]) => enqueueMock(...args),
}));

describe("webhook hooks non-blocking", () => {
  it("does not enqueue on idempotent replay", () => {
    maybeEnqueuePartnerReceiptIssued({
      partnerId: "partner-a",
      replayStatus: "idempotent_replay",
      decision: "approved",
      receiptId: "dr_1",
    });
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("enqueues only on issued approved receipts", () => {
    maybeEnqueuePartnerReceiptIssued({
      partnerId: "partner-a",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_1",
      policyId: "policy-a",
      decisionId: "decision-a",
    });
    expect(enqueueMock).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "partner.receipt.issued",
      partnerId: "partner-a",
      receiptId: "dr_1",
    }));
  });
});
