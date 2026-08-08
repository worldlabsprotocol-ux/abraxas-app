import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  approveDeletionPrivacyRequest,
  createPrivacyRequest,
  listPrivacyRequestsForSubject,
  privacyAuditMetadataHasNoPii,
  subjectOwnsRequest,
  userRequestIsNonDestructive,
} from "@/lib/privacy/privacyControlPlane";
import { buildPrivacyAuditMetadata } from "@/lib/privacy/privacyAuditContract";
import type { PrivacyRequestRecord } from "@/lib/privacy/types";

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
  getSupabaseAdmin: vi.fn(() => ({
    from: (...args: unknown[]) => fromMock(...args),
  })),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn().mockResolvedValue("audit-1"),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  revokeSubjectClaims: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/decisionReceipts/pseudonym", () => ({
  subjectPseudonymId: vi.fn(() => "pseudo-abc123"),
}));

import { revokeSubjectClaims } from "@/lib/credentials/claimsService";

function chainable(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

const SAMPLE_SUI = "0x0000000000000000000000000000000000000000000000000000000000000001";

const sampleRecord: PrivacyRequestRecord = {
  id: "00000000-0000-4000-8000-000000000099",
  subject_sui: SAMPLE_SUI,
  subject_pseudonym_id: "pseudo-abc123",
  request_type: "account_deletion",
  status: "under_review",
  reason_code: "operator_review_started",
  idempotency_key: "del-key-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("privacy control plane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
  });

  it("user request alone is non-destructive", () => {
    expect(userRequestIsNonDestructive()).toBe(true);
  });

  it("rejects audit metadata containing PII patterns", () => {
    expect(privacyAuditMetadataHasNoPii(buildPrivacyAuditMetadata({
      requestType: "data_export",
      fromStatus: null,
      toStatus: "requested",
      reasonCode: "holder_requested",
      changedByCategory: "holder",
      outcome: "created",
    }))).toBe(true);

    expect(privacyAuditMetadataHasNoPii({ email: "user@example.com" })).toBe(false);
    expect(privacyAuditMetadataHasNoPii({ wallet: "0xdeadbeef" })).toBe(false);
    expect(privacyAuditMetadataHasNoPii({ storage_path: "identity/foo/id_front.jpg" })).toBe(false);
  });

  it("enforces subject ownership", () => {
    expect(subjectOwnsRequest(sampleRecord, SAMPLE_SUI)).toBe(true);
    expect(subjectOwnsRequest(sampleRecord, "0x0000000000000000000000000000000000000000000000000000000000000002")).toBe(false);
  });

  it("creates privacy request idempotently", async () => {
    const insertChain = chainable({
      data: {
        ...sampleRecord,
        request_type: "data_export",
        status: "requested",
        reason_code: "holder_requested",
      },
      error: null,
    });
    const eventChain = chainable({ data: null, error: null });
    const lookupChain = chainable({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        return {
          ...insertChain,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: lookupChain.maybeSingle,
            }),
            single: insertChain.single,
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: insertChain.single }),
          }),
        };
      }
      if (table === "privacy_request_events") return eventChain;
      return insertChain;
    });

    const result = await createPrivacyRequest({
      subjectSui: SAMPLE_SUI,
      requestType: "data_export",
      idempotencyKey: "export-key-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(true);
      expect(result.request.request_ref).toHaveLength(8);
      expect(result.request).not.toHaveProperty("subject_sui");
    }
  });

  it("lists requests for subject without cross-subject leakage", async () => {
    const listChain = chainable({
      data: [{
        ...sampleRecord,
        request_type: "data_export",
        status: "requested",
      }],
      error: null,
    });
    listChain.eq = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [{
          ...sampleRecord,
          request_type: "data_export",
          status: "requested",
        }], error: null }),
      }),
    });

    fromMock.mockReturnValue(listChain);

    const rows = await listPrivacyRequestsForSubject(SAMPLE_SUI);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("subject_sui");
    expect(rows[0].request_ref).toHaveLength(8);
  });

  it("approved deletion revokes access only when explicitly approved", async () => {
    let call = 0;
    const getChain = chainable({ data: sampleRecord, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: getChain.maybeSingle }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(async () => {
                  call += 1;
                  const status = call === 1 ? "approved" : "access_revoked_pending_purge";
                  return {
                    data: { ...sampleRecord, status },
                    error: null,
                  };
                }),
              }),
            }),
          }),
        };
      }
      if (table === "privacy_request_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "identity_verifications") {
        return {
          update: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return getChain;
    });

    const result = await approveDeletionPrivacyRequest({
      requestId: sampleRecord.id,
      adminActorCategory: "admin_pin",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accessRevoked).toBe(true);
      expect(result.request.status).toBe("access_revoked_pending_purge");
    }
    expect(revokeSubjectClaims).toHaveBeenCalledWith(SAMPLE_SUI, "privacy_deletion_approved");
  });
});
