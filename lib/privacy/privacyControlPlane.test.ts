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
    rpc: (...args: unknown[]) => rpcMock(...args),
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

function privacyRequestTableMock(handlers: {
  maybeSingle?: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: handlers.maybeSingle ?? vi.fn().mockResolvedValue({ data: null, error: null }),
    single: handlers.single ?? vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.insert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: chain.single }) });
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
    const insertData = {
      ...sampleRecord,
      request_type: "data_export",
      status: "requested",
      reason_code: "holder_requested",
    };

    fromMock.mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        return privacyRequestTableMock({
          single: vi.fn().mockResolvedValue({ data: insertData, error: null }),
        });
      }
      if (table === "privacy_request_events") {
        return privacyRequestTableMock({});
      }
      return privacyRequestTableMock({});
    });

    const result = await createPrivacyRequest({
      subjectSui: SAMPLE_SUI,
      requestType: "data_export",
      idempotencyKey: "export-key-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(true);
      expect(result.request).not.toHaveProperty("subject_sui");
      expect(result.request).not.toHaveProperty("request_ref");
      expect(result.request).not.toHaveProperty("id");
    }
  });

  it("lists requests for subject without cross-subject leakage", async () => {
    const listChain = privacyRequestTableMock({});
    listChain.eq.mockReturnValue({
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
    expect(rows[0]).not.toHaveProperty("request_ref");
    expect(rows[0]).not.toHaveProperty("id");
  });

  it("returns existing active request for same subject and type", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        return privacyRequestTableMock({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ...sampleRecord, request_type: "data_export", status: "requested" },
            error: null,
          }),
        });
      }
      return privacyRequestTableMock({});
    });

    const result = await createPrivacyRequest({
      subjectSui: SAMPLE_SUI,
      requestType: "data_export",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.request.status).toBe("requested");
    }
  });

  it("approved deletion uses atomic RPC and does not call revokeSubjectClaims directly", async () => {
    const pendingRecord = {
      ...sampleRecord,
      status: "access_revoked_pending_purge" as const,
    };

    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        request_id: sampleRecord.id,
        status: "access_revoked_pending_purge",
        access_revoked: true,
      },
      error: null,
    });

    let lookupCalls = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        const chain = privacyRequestTableMock({});
        chain.maybeSingle = vi.fn(async () => {
          lookupCalls += 1;
          return {
            data: lookupCalls === 1 ? sampleRecord : pendingRecord,
            error: null,
          };
        });
        return chain;
      }
      return privacyRequestTableMock({});
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
    expect(rpcMock).toHaveBeenCalledWith("approve_privacy_deletion_atomic", expect.objectContaining({
      p_request_id: sampleRecord.id,
      p_admin_actor_category: "admin_pin",
    }));
    expect(revokeSubjectClaims).not.toHaveBeenCalled();
  });
});
