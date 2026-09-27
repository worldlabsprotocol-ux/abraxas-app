import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.fn();
const previewMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => sessionMock(...args),
}));
vi.mock("@/lib/verification/requestsService", () => ({
  getVerificationRequestPreview: (...args: unknown[]) => previewMock(...args),
}));

import { GET } from "./route";

const SUBJECT = "0x" + "a".repeat(64);

describe("GET /api/v1/verification-requests/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { suiAddress: SUBJECT } });
    previewMock.mockResolvedValue({
      request_id: "vr-123",
      status: "pending",
      partner_id: "example",
      policy_id: "example-policy",
    });
  });

  it("requires a browser session", async () => {
    sessionMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Sign in required" });
    const response = await GET(
      new NextRequest("http://localhost/api/v1/verification-requests/vr-123"),
      { params: Promise.resolve({ id: "vr-123" }) },
    );
    expect(response.status).toBe(401);
    expect(previewMock).not.toHaveBeenCalled();
  });

  it("binds preview lookup to the signed-in Passport subject", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/verification-requests/vr-123"),
      { params: Promise.resolve({ id: "vr-123" }) },
    );
    expect(response.status).toBe(200);
    expect(previewMock).toHaveBeenCalledWith("vr-123", SUBJECT);
  });

  it("hides a pre-addressed request from the wrong holder", async () => {
    previewMock.mockResolvedValueOnce(null);
    const response = await GET(
      new NextRequest("http://localhost/api/v1/verification-requests/vr-123"),
      { params: Promise.resolve({ id: "vr-123" }) },
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("Request not found");
  });

  it("returns an explicit expired response", async () => {
    previewMock.mockResolvedValueOnce({ request_id: "vr-123", status: "expired" });
    const response = await GET(
      new NextRequest("http://localhost/api/v1/verification-requests/vr-123"),
      { params: Promise.resolve({ id: "vr-123" }) },
    );
    expect(response.status).toBe(410);
  });
});
