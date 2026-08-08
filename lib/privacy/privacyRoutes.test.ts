import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const createPrivacyRequestMock = vi.fn();
const listPrivacyRequestsForSubjectMock = vi.fn();
const checkAdminAccessMock = vi.fn();
const resolveAdminAccessMock = vi.fn();
const approveDeletionPrivacyRequestMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: "0xholder" },
  })),
}));

vi.mock("@/lib/privacy/privacyControlPlane", () => ({
  createPrivacyRequest: (...args: unknown[]) => createPrivacyRequestMock(...args),
  listPrivacyRequestsForSubject: (...args: unknown[]) => listPrivacyRequestsForSubjectMock(...args),
  listPrivacyRequestsForAdmin: vi.fn().mockResolvedValue([]),
  approveDeletionPrivacyRequest: (...args: unknown[]) => approveDeletionPrivacyRequestMock(...args),
  getPrivacyRequestById: vi.fn(),
  startPrivacyRequestReview: vi.fn(),
  approveExportPrivacyRequest: vi.fn(),
  denyPrivacyRequest: vi.fn(),
  completePrivacyRequest: vi.fn(),
  placePrivacyRequestOnLegalHold: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({
  checkAdminAccess: (...args: unknown[]) => checkAdminAccessMock(...args),
  resolveAdminAccess: (...args: unknown[]) => resolveAdminAccessMock(...args),
}));

import { GET as holderGet, POST as holderPost } from "@/app/api/passport/privacy/requests/route";
import { POST as adminPost } from "@/app/api/admin/privacy/requests/[requestId]/route";

describe("privacy API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAdminAccessMock.mockResolvedValue(true);
    resolveAdminAccessMock.mockResolvedValue({ authorized: true, method: "pin_header" });
  });

  it("holder GET returns requests without internal subject fields", async () => {
    listPrivacyRequestsForSubjectMock.mockResolvedValue([{
      request_ref: "abcd1234",
      request_type: "data_export",
      status: "requested",
      status_label: "Request received",
      reason_code: "holder_requested",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    }]);

    const res = await holderGet(new NextRequest("http://localhost/api/passport/privacy/requests"));
    const body = await res.json() as { requests: Record<string, unknown>[] };

    expect(res.status).toBe(200);
    expect(body.requests[0]).not.toHaveProperty("subject_sui");
    expect(body.requests[0]).not.toHaveProperty("id");
    expect(JSON.stringify(body)).not.toContain("storage_path");
  });

  it("holder POST create does not revoke or delete", async () => {
    createPrivacyRequestMock.mockResolvedValue({
      ok: true,
      created: true,
      request: {
        request_ref: "abcd1234",
        request_type: "account_deletion",
        status: "requested",
        status_label: "Request received",
        reason_code: "holder_requested",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const res = await holderPost(new NextRequest("http://localhost/api/passport/privacy/requests", {
      method: "POST",
      body: JSON.stringify({ request_type: "account_deletion", idempotency_key: "k1" }),
    }));

    expect(res.status).toBe(201);
    expect(createPrivacyRequestMock).toHaveBeenCalledWith({
      subjectSui: "0xholder",
      requestType: "account_deletion",
      idempotencyKey: "k1",
    });
    expect(approveDeletionPrivacyRequestMock).not.toHaveBeenCalled();
  });

  it("admin deletion approve requires admin auth", async () => {
    checkAdminAccessMock.mockResolvedValue(false);

    const res = await adminPost(
      new NextRequest("http://localhost/api/admin/privacy/requests/r1", {
        method: "POST",
        body: JSON.stringify({ action: "approve_deletion" }),
      }),
      { params: Promise.resolve({ requestId: "r1" }) },
    );

    expect(res.status).toBe(401);
    expect(approveDeletionPrivacyRequestMock).not.toHaveBeenCalled();
  });

  it("admin deletion approve invokes control plane", async () => {
    approveDeletionPrivacyRequestMock.mockResolvedValue({
      ok: true,
      accessRevoked: true,
      request: {
        id: "r1",
        request_ref: "r1ref",
        status: "access_revoked_pending_purge",
      },
    });

    const res = await adminPost(
      new NextRequest("http://localhost/api/admin/privacy/requests/r1", {
        method: "POST",
        headers: { "x-admin-pin": "test" },
        body: JSON.stringify({ action: "approve_deletion" }),
      }),
      { params: Promise.resolve({ requestId: "r1" }) },
    );
    const body = await res.json() as { access_revoked?: boolean; purge_pending?: boolean };

    expect(res.status).toBe(200);
    expect(body.access_revoked).toBe(true);
    expect(body.purge_pending).toBe(true);
    expect(approveDeletionPrivacyRequestMock).toHaveBeenCalled();
  });
});
