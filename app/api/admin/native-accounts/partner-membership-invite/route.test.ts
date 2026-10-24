import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/admin/requireAdminRouteAccess", () => ({
  requireAdminRouteAccess: vi.fn(),
}));

vi.mock("@/lib/admin/designPartnerAdminActor", () => ({
  resolveDesignPartnerAdminActorCategory: vi.fn(async () => "platform_operator"),
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipInvitationGrant", () => ({
  grantPartnerMembershipByInvitation: vi.fn(),
}));

import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { grantPartnerMembershipByInvitation } from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";

describe("POST /api/admin/native-accounts/partner-membership-invite", () => {
  beforeEach(() => {
    vi.mocked(requireAdminRouteAccess).mockReset();
    vi.mocked(grantPartnerMembershipByInvitation).mockReset();
    vi.mocked(requireAdminRouteAccess).mockResolvedValue(null);
  });

  it("rejects unauthenticated admin", async () => {
    vi.mocked(requireAdminRouteAccess).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const req = new NextRequest("http://localhost/api/admin/native-accounts/partner-membership-invite", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects client ownership boolean", async () => {
    const req = new NextRequest("http://localhost/api/admin/native-accounts/partner-membership-invite", {
      method: "POST",
      body: JSON.stringify({ account_ownership_verified: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("account_ownership_verified_not_accepted");
  });

  it("delegates to invitation grant with recovery attestation", async () => {
    vi.mocked(grantPartnerMembershipByInvitation).mockResolvedValue({
      ok: true,
      partnerId: "p1",
      applicationId: "app1",
      accountId: "abx_ac_e492f1a1789e8a1f8c99a3f051b0c22c",
      role: "operator",
      alreadyMember: false,
      auditEventId: "audit_1",
    });

    const req = new NextRequest("http://localhost/api/admin/native-accounts/partner-membership-invite", {
      method: "POST",
      body: JSON.stringify({
        account_id: "abx_ac_e492f1a1789e8a1f8c99a3f051b0c22c",
        partner_id: "p1",
        application_id: "app1",
        reason: "Founder attestation verified out of band",
        recovery_attestation: "token",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(grantPartnerMembershipByInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ recoveryAttestationToken: "token" }),
    );
  });
});
