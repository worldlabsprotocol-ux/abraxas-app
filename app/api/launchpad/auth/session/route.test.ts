import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import { resetNativeAccountMemory, nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { upsertPartnerMembership } from "@/lib/auth/nativeAccount/store";
import { issueAccountSessionToken, ACCOUNT_SESSION_COOKIE } from "@/lib/auth/accountSession";

const getAppMock = vi.fn();

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: (...args: unknown[]) => getAppMock(...args),
}));

describe("POST /api/launchpad/auth/session account operator path", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    getAppMock.mockReset();
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "true";
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET = "01234567890123456789012345678901";
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "01234567890123456789012345678902";
  });

  it("issues partner console cookie from native account membership", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    await upsertPartnerMembership({
      accountId,
      partnerId: "studio-accept-wc-1792620888278-6a4a2447dfc8",
      role: "owner",
    });
    getAppMock.mockResolvedValue({
      id: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
      partner_id: "studio-accept-wc-1792620888278-6a4a2447dfc8",
    });

    const accountToken = await issueAccountSessionToken(accountId);
    expect(accountToken).toBeTruthy();

    const { POST } = await import("@/app/api/launchpad/auth/session/route");
    const res = await POST(
      new NextRequest("http://localhost/api/launchpad/auth/session", {
        method: "POST",
        headers: {
          cookie: `${ACCOUNT_SESSION_COOKIE}=${accountToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          application_id: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.auth_kind).toBe("account");
    expect(body.partner_id).toBe("studio-accept-wc-1792620888278-6a4a2447dfc8");
    expect(res.headers.get("set-cookie")).toContain("abraxas_partner_console_session=");
  });

  it("returns 403 when account lacks partner membership for the application", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    getAppMock.mockResolvedValue({
      id: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
      partner_id: "studio-accept-wc-1792620888278-6a4a2447dfc8",
    });

    const accountToken = await issueAccountSessionToken(accountId);
    const { POST } = await import("@/app/api/launchpad/auth/session/route");
    const res = await POST(
      new NextRequest("http://localhost/api/launchpad/auth/session", {
        method: "POST",
        headers: {
          cookie: `${ACCOUNT_SESSION_COOKIE}=${accountToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          application_id: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
        }),
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("launchpad_forbidden");
  });
});
