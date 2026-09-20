import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import type { GoLiveEvidence } from "./evaluate";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const loadEvidenceMock = vi.fn();
const submitMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolvePartnerConsoleSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/partner/launchpad/goLiveReadiness/load", () => ({
  loadGoLiveEvidence: (...args: unknown[]) => loadEvidenceMock(...args),
}));

vi.mock("@/lib/partner/launchpad/goLiveReadiness/submit", () => ({
  submitGoLiveReviewRequest: (...args: unknown[]) => submitMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({}),
  getSupabaseAdmin: () => null,
}));

const app = {
  id: "app-1",
  partner_id: "acme",
  status: "active",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
};

function readyEvidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: "app-1",
    partnerId: "acme",
    status: "active",
    environment: "sandbox",
    policyId: "acme-age_21_retail-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://partner.example/callback"],
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: ["partner.example"],
    starterKitEvidenced: false,
    starterKitRuntime: null,
    request: null,
    ...overrides,
  };
}

function post(body: Record<string, unknown>, cookie = true) {
  return new NextRequest("http://localhost/api/launchpad/applications/app-1/go-live", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: "abraxas_partner_console_session=test" } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("go-live review request route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue(app);
    loadEvidenceMock.mockResolvedValue(readyEvidence());
    submitMock.mockResolvedValue({
      ok: true,
      replay: false,
      request: { id: "req-1", status: "pending", created_at: "2026-01-01T00:00:00Z", reviewed_at: null },
    });
  });

  it("denies unsigned reads and writes", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const { GET, POST } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const read = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/go-live"), {
      params: { id: "app-1" },
    });
    expect(read.status).toBe(401);
    const write = await POST(post({}, false), { params: { id: "app-1" } });
    expect(write.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
  });

  it("authorizes the app with application_id plus session partner_id", async () => {
    getAppMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-b/go-live", {
      headers: { cookie: "abraxas_partner_console_session=test" },
    }), { params: { id: "app-b" } });
    expect(res.status).toBe(404);
    expect(getAppMock).toHaveBeenCalledWith("app-b", "acme");
  });

  it("denies incomplete readiness without activating Production", async () => {
    loadEvidenceMock.mockResolvedValue(readyEvidence({
      activeSandboxKey: false,
      allowedReturnUrls: ["http://localhost:3000/cb"],
      verifiedHostnames: [],
    }));
    submitMock.mockResolvedValue({ ok: false, code: "go_live_not_ready" });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const res = await POST(post({}), { params: { id: "app-1" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("go_live_not_ready");
    expect(body.issues_production_key).toBe(false);
    expect(body.activates_production).toBe(false);
    expect(body.automated_activation).toBeUndefined();
  });

  it("creates a pending request and never returns a production key", async () => {
    const { POST } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const res = await POST(post({ partner_note: "Please review" }), { params: { id: "app-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.automated_activation).toBe(false);
    expect(body.issues_production_key).toBe(false);
    expect(body.activates_production).toBe(false);
    expect(body.request.status).toBe("pending");
    expect(JSON.stringify(body)).not.toMatch(/abx_live_/);
    expect(submitMock).toHaveBeenCalled();
  });

  it("replays an existing pending request safely", async () => {
    const existing = { id: "req-9", status: "pending" as const, created_at: "2026-01-01T00:00:00Z", reviewed_at: null };
    loadEvidenceMock.mockResolvedValue(readyEvidence({ request: existing }));
    submitMock.mockResolvedValue({ ok: true, replay: true, request: existing });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const res = await POST(post({}), { params: { id: "app-1" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.replay).toBe(true);
    expect(body.request.id).toBe("req-9");
    expect(body.activates_production).toBe(false);
  });

  it("rejects client overrides and secret-like notes", async () => {
    const { POST } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const override = await POST(post({ partner_id: "other", status: "approved" }), { params: { id: "app-1" } });
    expect(override.status).toBe(400);
    expect((await override.json() as { error: string }).error).toBe("go_live_client_override_rejected");
    expect(submitMock).not.toHaveBeenCalled();

    const note = await POST(post({ partner_note: "abx_live_shouldnotpass" }), { params: { id: "app-1" } });
    expect(note.status).toBe(400);
    expect((await note.json() as { error: string }).error).toBe("go_live_note_invalid");
  });

  it("denies production activation fields on POST", async () => {
    const { POST } = await import("@/app/api/launchpad/applications/[id]/go-live/route");
    const res = await POST(post({ activate_production: true, issue_production_key: true }), { params: { id: "app-1" } });
    expect(res.status).toBe(400);
    expect(submitMock).not.toHaveBeenCalled();
  });
});
