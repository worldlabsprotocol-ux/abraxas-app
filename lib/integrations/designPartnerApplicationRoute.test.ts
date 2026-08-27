// FILE: lib/integrations/designPartnerApplicationRoute.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createClientMock = vi.hoisted(() => vi.fn());
const issueAuthenticationProofMock = vi.hoisted(() => vi.fn());
const sendAdminEmailMock = vi.hoisted(() => vi.fn());
const checkDesignPartnerApplyRateLimitMock = vi.hoisted(() => vi.fn());
const readBoundedJsonBodyMock = vi.hoisted(() => vi.fn());
const validateDesignPartnerApplicationEnvelopeMock = vi.hoisted(() => vi.fn());
const parseDesignPartnerApplicationFieldsMock = vi.hoisted(() => vi.fn());
const findRecentDuplicateDesignPartnerApplicationMock = vi.hoisted(() => vi.fn());
const logSafeOperationalErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/authenticationProof/issue", () => ({
  issueAuthenticationProof: (...args: unknown[]) => issueAuthenticationProofMock(...args),
}));

vi.mock("@/lib/notify/adminResend", () => ({
  sendAdminEmail: (...args: unknown[]) => sendAdminEmailMock(...args),
  adminEmailShell: (title: string, table: string) => `<h1>${title}</h1>${table}`,
  adminEmailTable: (rows: Record<string, string>) => JSON.stringify(rows),
}));

vi.mock("@/lib/integrations/designPartnerApplicationRateLimit", () => ({
  checkDesignPartnerApplyRateLimit: (...args: unknown[]) => checkDesignPartnerApplyRateLimitMock(...args),
  designPartnerApplyRateLimitResponse: () =>
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
  designPartnerApplyRateLimitUnavailableResponse: () =>
    new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503 }),
}));

vi.mock("@/lib/integrations/designPartnerApplicationIntake", () => ({
  readBoundedJsonBody: (...args: unknown[]) => readBoundedJsonBodyMock(...args),
  validateDesignPartnerApplicationEnvelope: (...args: unknown[]) =>
    validateDesignPartnerApplicationEnvelopeMock(...args),
  parseDesignPartnerApplicationFields: (...args: unknown[]) =>
    parseDesignPartnerApplicationFieldsMock(...args),
  findRecentDuplicateDesignPartnerApplication: (...args: unknown[]) =>
    findRecentDuplicateDesignPartnerApplicationMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookDispatchError", () => ({
  logSafeOperationalError: (...args: unknown[]) => logSafeOperationalErrorMock(...args),
}));

import { POST } from "@/app/api/integrations/apply/route";

const ROW = {
  company: "Acme Protocol",
  contact_name: null,
  email: "partner@example.com",
  website: null,
  use_case: null,
  monthly_volume: null,
  integration_type: "passport_gate",
  public_name_ok: false,
  status: "submitted" as const,
};

const PARSED = {
  ok: true as const,
  action: "insert" as const,
  row: ROW,
  emailDedupNorm: "partner@example.com",
  companyDedupNorm: "acme protocol",
};

function applyRequest() {
  return new NextRequest("http://localhost/api/integrations/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

function createInsertChain(result: { data?: { id: string } | null; error?: unknown }) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

describe("integrations apply route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    readBoundedJsonBodyMock.mockResolvedValue({ ok: true, text: "{}" });
    validateDesignPartnerApplicationEnvelopeMock.mockReturnValue({ ok: true, action: "continue" });
    parseDesignPartnerApplicationFieldsMock.mockReturnValue(PARSED);
    checkDesignPartnerApplyRateLimitMock.mockResolvedValue({
      allowed: true,
      backend: "memory",
      limit: 5,
      retryAfterSec: 3600,
    });
    findRecentDuplicateDesignPartnerApplicationMock.mockResolvedValue({ duplicate: false });
    issueAuthenticationProofMock.mockResolvedValue({ proof_id: "aprx_testproof1234" });
    sendAdminEmailMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not rate-limit oversized bodies", async () => {
    readBoundedJsonBodyMock.mockResolvedValue({ ok: false });

    const res = await POST(applyRequest());

    expect(res.status).toBe(400);
    expect(checkDesignPartnerApplyRateLimitMock).not.toHaveBeenCalled();
    expect(findRecentDuplicateDesignPartnerApplicationMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("does not rate-limit malformed JSON", async () => {
    readBoundedJsonBodyMock.mockResolvedValue({ ok: true, text: "not-json" });

    const res = await POST(applyRequest());

    expect(res.status).toBe(400);
    expect(checkDesignPartnerApplyRateLimitMock).not.toHaveBeenCalled();
    expect(parseDesignPartnerApplicationFieldsMock).not.toHaveBeenCalled();
  });

  it("does not rate-limit filled honeypots or perform downstream work", async () => {
    validateDesignPartnerApplicationEnvelopeMock.mockReturnValue({ ok: true, action: "honeypot" });

    const res = await POST(applyRequest());

    expect(res.status).toBe(200);
    expect(checkDesignPartnerApplyRateLimitMock).not.toHaveBeenCalled();
    expect(parseDesignPartnerApplicationFieldsMock).not.toHaveBeenCalled();
    expect(findRecentDuplicateDesignPartnerApplicationMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(issueAuthenticationProofMock).not.toHaveBeenCalled();
    expect(sendAdminEmailMock).not.toHaveBeenCalled();
  });

  it("does not rate-limit invalid fields", async () => {
    parseDesignPartnerApplicationFieldsMock.mockReturnValue({ ok: false });

    const res = await POST(applyRequest());

    expect(res.status).toBe(400);
    expect(checkDesignPartnerApplyRateLimitMock).not.toHaveBeenCalled();
    expect(findRecentDuplicateDesignPartnerApplicationMock).not.toHaveBeenCalled();
  });

  it("rate-limits valid requests once before dedup and database work", async () => {
    const insertChain = createInsertChain({ data: { id: "00000000-0000-4000-8000-000000000001" } });
    createClientMock.mockReturnValue({ from: vi.fn(() => insertChain) });

    const res = await POST(applyRequest());

    expect(res.status).toBe(200);
    expect(checkDesignPartnerApplyRateLimitMock).toHaveBeenCalledTimes(1);
    expect(parseDesignPartnerApplicationFieldsMock).toHaveBeenCalledBefore(
      checkDesignPartnerApplyRateLimitMock,
    );
    expect(checkDesignPartnerApplyRateLimitMock).toHaveBeenCalledBefore(findRecentDuplicateDesignPartnerApplicationMock);
    expect(findRecentDuplicateDesignPartnerApplicationMock).toHaveBeenCalledTimes(1);
    expect(insertChain.insert).toHaveBeenCalledTimes(1);
  });

  it("does not dedup, insert, proof, or email when rate-limited", async () => {
    checkDesignPartnerApplyRateLimitMock.mockResolvedValue({
      allowed: false,
      backend: "upstash",
      limit: 5,
      retryAfterSec: 3600,
    });

    const res = await POST(applyRequest());

    expect(res.status).toBe(429);
    expect(findRecentDuplicateDesignPartnerApplicationMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(issueAuthenticationProofMock).not.toHaveBeenCalled();
    expect(sendAdminEmailMock).not.toHaveBeenCalled();
  });

  it("returns generic success without record_id or proof", async () => {
    const insertChain = createInsertChain({ data: { id: "00000000-0000-4000-8000-000000000001" } });
    createClientMock.mockReturnValue({ from: vi.fn(() => insertChain) });

    const res = await POST(applyRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(body.record_id).toBeUndefined();
    expect(body.proof).toBeUndefined();
  });

  it("skips insert, proof, and email for best-effort duplicates", async () => {
    findRecentDuplicateDesignPartnerApplicationMock.mockResolvedValue({ duplicate: true, id: "existing" });
    const from = vi.fn();
    createClientMock.mockReturnValue({ from });

    const res = await POST(applyRequest());

    expect(res.status).toBe(200);
    expect(from).not.toHaveBeenCalled();
    expect(issueAuthenticationProofMock).not.toHaveBeenCalled();
    expect(sendAdminEmailMock).not.toHaveBeenCalled();
  });

  it("awaits operator email before resolving and still returns 200 when email rejects", async () => {
    const insertChain = createInsertChain({ data: { id: "00000000-0000-4000-8000-000000000003" } });
    createClientMock.mockReturnValue({ from: vi.fn(() => insertChain) });

    let emailResolve: ((value: { ok: boolean }) => void) | undefined;
    sendAdminEmailMock.mockImplementation(
      () => new Promise<{ ok: boolean }>((resolve) => {
        emailResolve = resolve;
      }),
    );

    let settled = false;
    const responsePromise = POST(applyRequest()).then((res) => {
      settled = true;
      return res;
    });

    await vi.waitFor(() => {
      expect(sendAdminEmailMock).toHaveBeenCalledTimes(1);
    });
    expect(settled).toBe(false);

    emailResolve?.({ ok: false });
    const res = await responsePromise;

    expect(res.status).toBe(200);
    expect(settled).toBe(true);
  });

  it("returns 200 after insert when proof fails, awaits one email, and uses unavailable label", async () => {
    const insertChain = createInsertChain({ data: { id: "00000000-0000-4000-8000-000000000002" } });
    createClientMock.mockReturnValue({ from: vi.fn(() => insertChain) });
    issueAuthenticationProofMock.mockRejectedValue(new Error("proof failed with secret@example.com"));

    let emailResolve: ((value: { ok: boolean }) => void) | undefined;
    sendAdminEmailMock.mockImplementation(
      () => new Promise<{ ok: boolean }>((resolve) => {
        emailResolve = resolve;
      }),
    );

    const responsePromise = POST(applyRequest());

    await vi.waitFor(() => {
      expect(sendAdminEmailMock).toHaveBeenCalledTimes(1);
    });

    emailResolve?.({ ok: true });
    const res = await responsePromise;

    expect(res.status).toBe(200);
    expect(logSafeOperationalErrorMock).toHaveBeenCalledWith("integrations.apply.proof", expect.any(Error));
    const emailPayload = sendAdminEmailMock.mock.calls[0]?.[0] as { html: string };
    expect(emailPayload.html).toContain("unavailable");
    expect(emailPayload.html).not.toContain("secret@example.com");
    for (const call of logSafeOperationalErrorMock.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("secret@example.com");
      expect(JSON.stringify(call)).not.toContain("partner@example.com");
    }
  });

  it("logs rejected email safely and returns 200 without provider details in response", async () => {
    const insertChain = createInsertChain({ data: { id: "00000000-0000-4000-8000-000000000004" } });
    createClientMock.mockReturnValue({ from: vi.fn(() => insertChain) });
    sendAdminEmailMock.mockRejectedValue(new Error("resend provider secret-token leaked"));

    const res = await POST(applyRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(logSafeOperationalErrorMock).toHaveBeenCalledWith("integrations.apply.notify", expect.any(Error));
    for (const call of logSafeOperationalErrorMock.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("secret-token");
    }
  });

  it("returns 500 generic error when insert fails without echoing PII", async () => {
    const insertChain = createInsertChain({ data: null, error: { message: "duplicate key partner@example.com" } });
    createClientMock.mockReturnValue({ from: vi.fn(() => insertChain) });

    const res = await POST(applyRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Could not save application" });
    expect(JSON.stringify(body)).not.toContain("partner@example.com");
    expect(logSafeOperationalErrorMock).toHaveBeenCalled();
    expect(sendAdminEmailMock).not.toHaveBeenCalled();
  });
});
