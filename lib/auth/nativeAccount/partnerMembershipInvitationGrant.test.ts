import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  grantPartnerMembershipByInvitation,
  isValidNativeAccountSubjectId,
} from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: vi.fn(),
}));

vi.mock("@/lib/auth/nativeAccount/store", () => ({
  assertPartnerMembership: vi.fn(),
  upsertPartnerMembership: vi.fn(),
  recordMembershipGrant: vi.fn(),
  NativeAccountStoreUnavailableError: class NativeAccountStoreUnavailableError extends Error {},
}));

import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  assertPartnerMembership,
  recordMembershipGrant,
  upsertPartnerMembership,
} from "@/lib/auth/nativeAccount/store";

const ACCOUNT = "abx_ac_e492f1a1789e8a1f8c99a3f051b0c22c";
const PARTNER = "studio-accept-wc-1792620888278-6a4a2447dfc8";
const APP = "fbea93d2-6660-428d-85c3-8c4e12d89b05";

describe("partnerMembershipInvitationGrant", () => {
  beforeEach(() => {
    vi.mocked(getLaunchpadApplicationById).mockReset();
    vi.mocked(assertPartnerMembership).mockReset();
    vi.mocked(upsertPartnerMembership).mockReset();
    vi.mocked(recordMembershipGrant).mockReset();
  });

  it("validates account id format", () => {
    expect(isValidNativeAccountSubjectId(ACCOUNT)).toBe(true);
    expect(isValidNativeAccountSubjectId("abx_ac_short")).toBe(false);
  });

  it("requires account ownership verification flag", async () => {
    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via native session",
      approverActorId: "platform_operator",
      accountOwnershipVerified: false,
    });
    expect(result).toEqual({ ok: false, code: "account_ownership_not_verified" });
  });

  it("grants operator membership with invitation audit metadata", async () => {
    vi.mocked(getLaunchpadApplicationById).mockResolvedValue({
      partner_id: PARTNER,
    } as never);
    vi.mocked(assertPartnerMembership).mockResolvedValue({ ok: false });
    vi.mocked(upsertPartnerMembership).mockResolvedValue(undefined);
    vi.mocked(recordMembershipGrant).mockResolvedValue(undefined);

    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via GET /api/auth/native/session",
      approverActorId: "platform_operator",
      accountOwnershipVerified: true,
    });

    expect(result).toMatchObject({
      ok: true,
      alreadyMember: false,
      role: "operator",
    });
    expect(upsertPartnerMembership).toHaveBeenCalledWith({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      role: "operator",
    });
    expect(recordMembershipGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        grantMethod: "invitation",
        metadata: expect.objectContaining({ application_id: APP }),
      }),
    );
  });
});
