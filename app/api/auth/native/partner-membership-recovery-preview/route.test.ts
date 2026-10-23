// FILE: app/api/auth/native/partner-membership-recovery-preview/route.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/auth/accountSession", () => ({
  requireAccountSession: vi.fn(),
}));

vi.mock("@/lib/auth/nativeAccount/apiGate", () => ({
  assertNativeAuthEnabled: vi.fn(() => null),
  mapNativeStoreError: vi.fn(),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: vi.fn(),
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment", () => ({
  assertPartnerMembershipInvitationEnvironment: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/auth/nativeAccount/store", () => ({
  assertPartnerMembership: vi.fn(),
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnership", () => ({
  resolveRecoveryOwnershipEntitlement: vi.fn(),
}));

import { requireAccountSession } from "@/lib/auth/accountSession";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { assertPartnerMembership } from "@/lib/auth/nativeAccount/store";
import { resolveRecoveryOwnershipEntitlement } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnership";

describe("GET /api/auth/native/partner-membership-recovery-preview", () => {
  beforeEach(() => {
    vi.mocked(requireAccountSession).mockResolvedValue({
      ok: true,
      session: { accountId: "abx_ac_test", authMethod: "solana_wallet" },
    } as never);
    vi.mocked(getLaunchpadApplicationById).mockResolvedValue({
      partner_id: "partner_a",
      status: "active",
    } as never);
    vi.mocked(assertPartnerMembership).mockResolvedValue({ ok: false });
    vi.mocked(resolveRecoveryOwnershipEntitlement).mockResolvedValue({
      kind: "admin_review_required",
      basis: "provisioning_review",
      provisioning: { application_name: "Demo", application_status: "active", provisioned_at: null },
    });
  });

  it("returns entitlement preview without minting attestation", async () => {
    const req = new NextRequest(
      "http://localhost/api/auth/native/partner-membership-recovery-preview?application_id=app1&partner_id=partner_a",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership_status).toBe("not_linked");
    expect(body.entitlement.kind).toBe("admin_review_required");
  });
});
