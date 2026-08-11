// FILE: lib/demo/partnerSandboxDemoIdempotency.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import { demoResponseHasNoOperationalClaims } from "@/lib/demo/partnerSandboxDemoViews";

const getHolderCredentialStatusMock = vi.fn();
const issuePartnerSessionReceiptMock = vi.fn();
const getReceiptByIdMock = vi.fn();
const maybeRecordMeteringMock = vi.fn();
const maybeEnqueueWebhookMock = vi.fn();

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/partner/relyingPartyFlow", () => ({
  getHolderCredentialStatus: (...args: unknown[]) => getHolderCredentialStatusMock(...args),
  issuePartnerSessionReceipt: (...args: unknown[]) => issuePartnerSessionReceiptMock(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptByIdMock(...args),
  getPublicReceipt: vi.fn(),
}));

vi.mock("@/lib/partner/partnerMeteringHooks", () => ({
  maybeRecordPartnerFlowReceiptMetering: (...args: unknown[]) => maybeRecordMeteringMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookHooks", () => ({
  maybeEnqueuePartnerReceiptIssued: (...args: unknown[]) => maybeEnqueueWebhookMock(...args),
}));

vi.mock("@/lib/demo/partnerSandboxDemoConfig", () => ({
  resolvePartnerSandboxDemoSubjectId: () => ({
    ok: true,
    subjectId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  }),
}));

import { completePartnerSandboxDemoReceipt } from "@/lib/demo/partnerSandboxDemoService";

const RECEIPT_ID = "dr_sandbox_idempotent01";

describe("completePartnerSandboxDemoReceipt idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHolderCredentialStatusMock.mockResolvedValue({
      status: "active",
      credential_jti: "jti-demo",
    });
    getReceiptByIdMock.mockResolvedValue({
      partner_id: DEMO_SANDBOX_PARTNER_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision_context: "sandbox_only",
    });
  });

  it("does not expose metering or webhook success fields in the response", async () => {
    issuePartnerSessionReceiptMock.mockResolvedValue({
      decision_id: "dec-demo",
      receipt_id: RECEIPT_ID,
      replay_status: "issued",
      partner_result: { decision: "approved" },
    });

    const result = await completePartnerSandboxDemoReceipt();

    expect(demoResponseHasNoOperationalClaims(result)).toBe(true);
    expect(result).not.toHaveProperty("metering");
    expect(result).not.toHaveProperty("webhook");
  });

  it("repeated Complete returns the same receipt without creating another", async () => {
    issuePartnerSessionReceiptMock
      .mockResolvedValueOnce({
        decision_id: "dec-demo",
        receipt_id: RECEIPT_ID,
        replay_status: "issued",
        partner_result: { decision: "approved" },
      })
      .mockResolvedValueOnce({
        decision_id: "dec-demo",
        receipt_id: RECEIPT_ID,
        replay_status: "idempotent_replay",
        partner_result: { decision: "approved" },
      });

    const first = await completePartnerSandboxDemoReceipt();
    const second = await completePartnerSandboxDemoReceipt();

    expect(first.receipt_id).toBe(RECEIPT_ID);
    expect(second.receipt_id).toBe(RECEIPT_ID);
    expect(first.replay_status).toBe("issued");
    expect(second.replay_status).toBe("idempotent_replay");
    expect(issuePartnerSessionReceiptMock).toHaveBeenCalledTimes(2);
    expect(getReceiptByIdMock).toHaveBeenCalledTimes(2);
  });

  it("passes idempotent replay status to maybe hooks without exposing hook results", async () => {
    issuePartnerSessionReceiptMock.mockResolvedValue({
      decision_id: "dec-demo",
      receipt_id: RECEIPT_ID,
      replay_status: "idempotent_replay",
      partner_result: { decision: "approved" },
    });

    const result = await completePartnerSandboxDemoReceipt();

    expect(result.replay_status).toBe("idempotent_replay");
    expect(maybeRecordMeteringMock).toHaveBeenCalledWith(
      expect.objectContaining({ replayStatus: "idempotent_replay" }),
    );
    expect(maybeEnqueueWebhookMock).toHaveBeenCalledWith(
      expect.objectContaining({ replayStatus: "idempotent_replay" }),
    );
    expect(demoResponseHasNoOperationalClaims(result)).toBe(true);
  });
});
