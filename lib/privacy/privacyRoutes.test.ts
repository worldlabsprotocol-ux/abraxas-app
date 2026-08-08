import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  holderPrivacyPayloadHasNoForbiddenFields,
  holderPrivacyRequestHasOnlyAllowedFields,
} from "@/lib/privacy/holderResponseContract";

const createPrivacyRequestMock = vi.fn();
const listPrivacyRequestsForSubjectMock = vi.fn();
const checkAdminAccessMock = vi.fn();
const resolveAdminAccessMock = vi.fn();
const approveDeletionPrivacyRequestMock = vi.fn();
const requireBrowserSessionMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSessionMock(...args),
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

const HOLDER_REQUEST = {
  request_type: "data_export",
  status: "requested",
  status_label: "Request received",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("privacy API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAdminAccessMock.mockResolvedValue(true);
    resolveAdminAccessMock.mockResolvedValue({ authorized: true, method: "pin_header" });
    requireBrowserSessionMock.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0x0000000000000000000000000000000000000000000000000000000000000001" },
    });
  });

  it("holder GET returns status and dates only", async () => {
    listPrivacyRequestsForSubjectMock.mockResolvedValue([HOLDER_REQUEST]);

    const res = await holderGet(new NextRequest("http://localhost/api/passport/privacy/requests"));
    const body = await res.json() as { requests: Record<string, unknown>[] };

    expect(res.status).toBe(200);
    expect(holderPrivacyRequestHasOnlyAllowedFields(body.requests[0])).toBe(true);
    expect(holderPrivacyPayloadHasNoForbiddenFields(body)).toBe(true);
  });

  it("holder GET scopes list to signed-in session subject only", async () => {
    listPrivacyRequestsForSubjectMock.mockResolvedValue([]);

    await holderGet(new NextRequest("http://localhost/api/passport/privacy/requests"));

    expect(listPrivacyRequestsForSubjectMock).toHaveBeenCalledWith(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
  });

  it("holder GET returns 401 without session", async () => {
    requireBrowserSessionMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Sign in required" });

    const res = await holderGet(new NextRequest("http://localhost/api/passport/privacy/requests"));
    expect(res.status).toBe(401);
    expect(listPrivacyRequestsForSubjectMock).not.toHaveBeenCalled();
  });

  it("holder POST create does not revoke or delete", async () => {
    createPrivacyRequestMock.mockResolvedValue({
      ok: true,
      created: true,
      request: {
        ...HOLDER_REQUEST,
        request_type: "account_deletion",
      },
    });

    const res = await holderPost(new NextRequest("http://localhost/api/passport/privacy/requests", {
      method: "POST",
      body: JSON.stringify({ request_type: "account_deletion", idempotency_key: "k1" }),
    }));
    const body = await res.json() as { request: Record<string, unknown> };

    expect(res.status).toBe(201);
    expect(holderPrivacyRequestHasOnlyAllowedFields(body.request)).toBe(true);
    expect(createPrivacyRequestMock).toHaveBeenCalledWith({
      subjectSui: "0x0000000000000000000000000000000000000000000000000000000000000001",
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
