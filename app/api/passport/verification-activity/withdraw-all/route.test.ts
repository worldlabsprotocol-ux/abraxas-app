import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const sessionMock = vi.fn();
const loadMock = vi.fn();
const withdrawMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => sessionMock(...args),
}));
vi.mock("@/lib/passport/verificationActivity/load", () => ({
  loadPassportVerificationActivity: (...args: unknown[]) => loadMock(...args),
}));
vi.mock("@/lib/passport/verificationActivity/withdraw", () => ({
  withdrawHolderSharedResult: (...args: unknown[]) => withdrawMock(...args),
}));

import { POST } from "./route";

const SUBJECT = "0x" + "e".repeat(64);

function post(body: unknown, suffix = "") {
  return new NextRequest(`http://localhost/api/passport/verification-activity/withdraw-all${suffix}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function activity(activityRef: string, current: boolean) {
  return {
    activity_ref: activityRef,
    current,
  };
}

describe("POST /api/passport/verification-activity/withdraw-all", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { suiAddress: SUBJECT } });
    loadMock.mockResolvedValue({
      items: [activity("pa_current_1", true), activity("pa_history", false), activity("pa_current_2", true)],
    });
    withdrawMock.mockResolvedValue({
      ok: true,
      view: { already_withdrawn: false },
    });
  });

  it("requires the signed-in Passport session", async () => {
    sessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const response = await POST(post({ confirm: "withdraw_all_current" }));
    expect(response.status).toBe(401);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("rejects missing confirmation and client authority fields", async () => {
    const missing = await POST(post({}));
    expect(missing.status).toBe(400);

    const override = await POST(post({
      confirm: "withdraw_all_current",
      receipt_id: "dr_private",
    }));
    expect(override.status).toBe(400);
    expect(withdrawMock).not.toHaveBeenCalled();
  });

  it("withdraws only current opaque activity references for the session subject", async () => {
    const response = await POST(post({ confirm: "withdraw_all_current" }));
    expect(response.status).toBe(200);
    expect(loadMock).toHaveBeenCalledWith(SUBJECT);
    expect(withdrawMock).toHaveBeenCalledTimes(2);
    expect(withdrawMock).toHaveBeenNthCalledWith(1, {
      subjectId: SUBJECT,
      activityRef: "pa_current_1",
      clientBody: { activity_ref: "pa_current_1" },
    });
    expect(withdrawMock).toHaveBeenNthCalledWith(2, {
      subjectId: SUBJECT,
      activityRef: "pa_current_2",
      clientBody: { activity_ref: "pa_current_2" },
    });
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, withdrawn: 2, failed: 0 });
    expect(JSON.stringify(body)).not.toMatch(/activity_ref|receipt_id|subject/i);
  });

  it("returns a bounded partial result without leaking failed references", async () => {
    withdrawMock
      .mockResolvedValueOnce({ ok: true, view: { already_withdrawn: false } })
      .mockResolvedValueOnce({ ok: false, error: "unavailable", status: 503 });

    const response = await POST(post({ confirm: "withdraw_all_current" }));
    expect(response.status).toBe(207);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, withdrawn: 1, failed: 1 });
    expect(JSON.stringify(body)).not.toContain("pa_current_2");
  });
});
