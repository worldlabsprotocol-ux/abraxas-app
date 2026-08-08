import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  checkPartnerFlowRevocationGate,
  findRevokedPartnerSessionReceipt,
  isPartnerFlowRevocationDenied,
} from "@/lib/partner/partnerFlowRevocationRuntime";

const fromMock = vi.fn();
const getPartnerPolicy = vi.fn();
const findActiveSessionDecision = vi.fn();
const findDecisionByVerificationRequest = vi.fn();
const findSessionReceiptForSupersede = vi.fn();
const getReceiptByDecisionId = vi.fn();
const getReceiptById = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: (...args: unknown[]) => getPartnerPolicy(...args),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: (...args: unknown[]) => findActiveSessionDecision(...args),
  findDecisionByVerificationRequest: (...args: unknown[]) => findDecisionByVerificationRequest(...args),
  findSessionReceiptForSupersede: (...args: unknown[]) => findSessionReceiptForSupersede(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptByDecisionId: (...args: unknown[]) => getReceiptByDecisionId(...args),
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
}));

describe("partnerFlowRevocationRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPartnerPolicy.mockResolvedValue({
      id: "partner-policy-v1",
      partner_id: "partner-a",
      version: 1,
      rules_json: {
        required_claims: [{ claim_type: "identity_verified" }],
      },
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "credential_claims") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
    findActiveSessionDecision.mockResolvedValue(null);
    findDecisionByVerificationRequest.mockResolvedValue(null);
    findSessionReceiptForSupersede.mockResolvedValue(null);
    getReceiptByDecisionId.mockResolvedValue(null);
    getReceiptById.mockResolvedValue(null);
  });

  it("blocks evaluate when policy claim is revoked", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "credential_claims") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ claim_type: "identity_verified", status: "revoked" }],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const denied = await checkPartnerFlowRevocationGate({
      subjectId: "0xabc",
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      operation: "evaluate",
    });

    expect(denied?.next).toBe("denied");
    expect(denied?.invalidation_reasons).toContain("claim_revoked");
  });

  it("blocks refresh when receipt-only revocation exists", async () => {
    findSessionReceiptForSupersede.mockResolvedValue("dr_revoked");
    getReceiptById.mockResolvedValue({ id: "dr_revoked", status: "revoked" });

    const revoked = await findRevokedPartnerSessionReceipt({
      partnerId: "partner-a",
      subjectId: "0xabc",
      policyId: "partner-policy-v1",
      includeSupersedeTarget: true,
    });
    expect(revoked?.id).toBe("dr_revoked");

    const denied = await checkPartnerFlowRevocationGate({
      subjectId: "0xabc",
      partnerId: "partner-a",
      policyId: "partner-policy-v1",
      operation: "refresh",
    });
    expect(denied?.invalidation_reasons).toContain("receipt_revoked");
  });

  it("detects revocation denied responses", () => {
    expect(isPartnerFlowRevocationDenied({
      next: "denied",
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe(true);
    expect(isPartnerFlowRevocationDenied({
      next: "denied",
      currently_valid: false,
      invalidation_reasons: ["missing:identity_verified"],
    })).toBe(false);
    expect(isPartnerFlowRevocationDenied({
      next: "denied",
      currently_valid: false,
      invalidation_reasons: [],
    })).toBe(false);
  });
});
