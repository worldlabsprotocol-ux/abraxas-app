import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { opaqueActivityRef } from "@/lib/passport/verificationActivity/view";
import { PASSPORT_ACTIVITY_WITHDRAW_NOT_FOUND } from "@/lib/passport/verificationActivity/contract";

const requireBrowserSessionMock = vi.fn();
const withdrawMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSessionMock(...args),
}));

vi.mock("@/lib/passport/verificationActivity/withdraw", async () => {
  const actual = await vi.importActual<typeof import("@/lib/passport/verificationActivity/withdraw")>(
    "@/lib/passport/verificationActivity/withdraw",
  );
  return {
    ...actual,
    withdrawHolderSharedResult: (...args: unknown[]) => withdrawMock(...args),
  };
});

import { POST } from "@/app/api/passport/verification-activity/withdraw/route";

const SUBJECT = "0x" + "e".repeat(64);
const REF = opaqueActivityRef(SUBJECT, "dec-1");

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/passport/verification-activity/withdraw", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    requireBrowserSessionMock.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUBJECT },
    });
    withdrawMock.mockResolvedValue({
      ok: true,
      view: {
        ok: true,
        state: "revoked",
        state_label: "Revoked",
        already_withdrawn: false,
        next_step: "safe",
      },
    });
  });

  it("denies unsigned requests", async () => {
    requireBrowserSessionMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Sign in required" });
    const res = await POST(post("http://localhost/api/passport/verification-activity/withdraw", { activity_ref: REF }));
    expect(res.status).toBe(401);
    expect(withdrawMock).not.toHaveBeenCalled();
  });

  it("passes only the session subject and opaque activity_ref", async () => {
    const res = await POST(post(
      "http://localhost/api/passport/verification-activity/withdraw?subject=other&receipt_id=dr_abc",
      { activity_ref: REF },
    ));
    expect(res.status).toBe(200);
    expect(withdrawMock).toHaveBeenCalledTimes(1);
    expect(withdrawMock).toHaveBeenCalledWith({
      subjectId: SUBJECT,
      activityRef: REF,
      clientBody: { activity_ref: REF },
    });
    const body = await res.json() as Record<string, unknown>;
    expect(body.state).toBe("revoked");
    expect(JSON.stringify(body)).not.toContain("dr_abc");
  });

  it("rejects raw receipt ids from the browser", async () => {
    withdrawMock.mockResolvedValueOnce({
      ok: false,
      error: "client_override_rejected",
      status: 400,
    });
    const res = await POST(post("http://localhost/api/passport/verification-activity/withdraw", {
      activity_ref: REF,
      receipt_id: "dr_live",
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("disclosure_rejected");
  });

  it("returns a safe not-found when the activity is not in this Passport", async () => {
    withdrawMock.mockResolvedValueOnce({ ok: false, error: "not_found", status: 404 });
    const res = await POST(post("http://localhost/api/passport/verification-activity/withdraw", { activity_ref: REF }));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe(PASSPORT_ACTIVITY_WITHDRAW_NOT_FOUND);
  });
});
