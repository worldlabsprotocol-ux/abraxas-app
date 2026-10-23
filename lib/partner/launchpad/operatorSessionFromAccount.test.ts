import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import { resetNativeAccountMemory, nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { upsertPartnerMembership } from "@/lib/auth/nativeAccount/store";
import { resolveOperatorPartnerForAccountMembership } from "@/lib/partner/launchpad/operatorSessionFromAccount";

const getAppMock = vi.fn();

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: (...args: unknown[]) => getAppMock(...args),
}));

describe("resolveOperatorPartnerForAccountMembership", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    getAppMock.mockReset();
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "true";
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
  });

  it("requires membership for a deep-linked application", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    getAppMock.mockResolvedValue({
      id: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
      partner_id: "studio-accept-wc-1792620888278-6a4a2447dfc8",
    });

    const denied = await resolveOperatorPartnerForAccountMembership({
      accountId,
      applicationId: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
    });
    expect(denied).toEqual({ ok: false, code: "membership_required" });

    await upsertPartnerMembership({
      accountId,
      partnerId: "studio-accept-wc-1792620888278-6a4a2447dfc8",
      role: "owner",
    });

    const allowed = await resolveOperatorPartnerForAccountMembership({
      accountId,
      applicationId: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
    });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      expect(allowed.partnerId).toBe("studio-accept-wc-1792620888278-6a4a2447dfc8");
    }
  });

  it("uses the sole membership when partner_id is omitted", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    await upsertPartnerMembership({ accountId, partnerId: "tenant-only", role: "operator" });

    const resolved = await resolveOperatorPartnerForAccountMembership({ accountId });
    expect(resolved).toEqual({ ok: true, partnerId: "tenant-only", role: "operator" });
  });
});
