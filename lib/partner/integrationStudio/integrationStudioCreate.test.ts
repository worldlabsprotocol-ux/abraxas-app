import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";

const resolvePartnerConsoleSessionMock = vi.fn();
const provisionMock = vi.fn();
const recordActivityMock = vi.fn();
const issueTokenMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolvePartnerConsoleSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
  issuePartnerConsoleSessionToken: (...args: unknown[]) => issueTokenMock(...args),
  attachPartnerConsoleSessionCookie: (res: Response) => res,
}));

vi.mock("@/lib/partner/launchpad/provisionSandbox", () => ({
  provisionLaunchpadSandbox: (...args: unknown[]) => provisionMock(...args),
}));

vi.mock("@/lib/partner/launchpad/recordActivity", () => ({
  recordLaunchpadActivity: (...args: unknown[]) => recordActivityMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: () => ({ insert: async () => ({}) }) }),
  getSupabaseAdmin: () => null,
}));

function post(body: Record<string, unknown>, cookie = true) {
  return new NextRequest("http://localhost/api/developers/integration-studio", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: "abraxas_partner_console_session=test" } : {}),
    },
    body: JSON.stringify(body),
  });
}

const sandboxResult = {
  ok: true as const,
  idempotencyReplay: false,
  apiKey: "abx_test_once_only_secret",
  result: {
    application_id: "app-1",
    partner_id: "acme",
    public_slug: "acme-retail",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    api_key_id: "key-1",
    api_key: "abx_test_once_only_secret",
    key_prefix: "abx_test_abcd",
    hosted_verify_url: "http://localhost/partner/verify?app=acme-retail&return_url=http%3A%2F%2Flocalhost%3A3000%2Fcallback",
  },
};

describe("Integration Studio self-service sandbox create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    provisionMock.mockImplementation(async (input: { partnerId: string; policyTemplateId: string }) => ({
      ...sandboxResult,
      result: {
        ...sandboxResult.result,
        partner_id: input.partnerId,
        policy_id: buildLaunchpadPolicyId(input.partnerId, input.policyTemplateId),
      },
    }));
    recordActivityMock.mockResolvedValue(undefined);
    issueTokenMock.mockResolvedValue("token");
  });

  it("creates a sandbox app for the signed-in partner and shows the key once", async () => {
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as {
      ok: boolean;
      environment: string;
      self_serve_production: boolean;
      api_key: string | null;
      application: { partner_id: string; api_key?: string; key_prefix: string };
      path_instructions: { hosted_partner_flow: { code: string } };
      docs: { hosted_link: string; sandbox_testing: string[] };
    };
    expect(json.ok).toBe(true);
    expect(json.environment).toBe("sandbox");
    expect(json.self_serve_production).toBe(false);
    expect(json.api_key).toBe("abx_test_once_only_secret");
    expect(json.application.partner_id).toBe("acme");
    expect(json.application.api_key).toBeUndefined();
    expect(json.application.key_prefix).toBe("abx_test_abcd");
    expect((json as { resume_href?: string }).resume_href).toBe("/developers/launchpad?app=app-1");
    expect(json.path_instructions.hosted_partner_flow.code).toContain("acme");
    expect(json.docs.hosted_link).toContain("/partner/verify?app=acme-retail");
    expect(json.docs.hosted_link).toContain("return_url=");
    expect(json.docs.sandbox_testing.length).toBeGreaterThan(0);
    expect(provisionMock).toHaveBeenCalledWith(expect.objectContaining({
      partnerId: "acme",
      policyTemplateId: "age_21_retail",
    }));
    expect(recordActivityMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: "application_provisioned",
      publicCode: "studio_sandbox_created",
    }));
  });

  it("creates an isolated sandbox for a new browser without zkLogin or an existing API key", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
      sandbox_id: "12345678-90ab-cdef-1234-567890abcdef",
    }, false));
    expect(res.status).toBe(200);
    expect(provisionMock).toHaveBeenCalledWith(expect.objectContaining({
      partnerId: "studio-retail-sandbox-1234567890ab",
      policyTemplateId: "age_21_retail",
    }));
    expect(issueTokenMock).toHaveBeenCalledWith(expect.objectContaining({
      partnerId: "studio-retail-sandbox-1234567890ab",
      environment: "sandbox",
    }));
  });

  it("requires a stable browser sandbox id when no partner session exists", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
    }, false));
    expect(res.status).toBe(400);
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("rejects client-supplied policy_id overrides", async () => {
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
      policy_id: "acme-forged-policy-v99",
    }));
    expect(res.status).toBe(403);
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("rejects provision results whose policy pin does not match the catalog template", async () => {
    provisionMock.mockResolvedValue({
      ...sandboxResult,
      result: { ...sandboxResult.result, policy_id: "forged-policy-pin" },
    });
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
    }));
    expect(res.status).toBe(400);
    const json = await res.json() as { code?: string };
    expect(json.code).toMatch(/policy_template_invalid/);
  });

  it("rejects cross-tenant partner_id", async () => {
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
      partner_id: "other-tenant",
    }));
    expect(res.status).toBe(403);
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("returns actionable copy when provisioning fails", async () => {
    provisionMock.mockResolvedValue({ ok: false, code: "provision_failed", reason: "provision_rpc_failed" });
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
    }));
    expect(res.status).toBe(500);
    const json = await res.json() as { code?: string; error?: string };
    expect(json.code).toBe("launchpad_provision_failed");
    expect(json.error).toContain("Sandbox creation failed");
  });

  it("rejects unsafe callbacks", async () => {
    provisionMock.mockResolvedValue({ ok: false, code: "return_url_rejected" });
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://169.254.169.254/callback",
    }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string; code?: string };
    expect(json.code).toBe("launchpad_return_url_rejected");
    expect(json.error.toLowerCase()).toContain("callback");
    expect(JSON.stringify(json)).not.toContain("169.254");
  });

  it("omits the key on idempotent replay", async () => {
    provisionMock.mockResolvedValue({
      ...sandboxResult,
      idempotencyReplay: true,
      apiKey: undefined,
      result: { ...sandboxResult.result, api_key: "" },
    });
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const reqBody = {
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
      idempotency_key: "studio-replay-1",
    };
    const first = await POST(post(reqBody));
    const firstJson = await first.json() as { api_key: string | null; idempotency_replay: boolean };
    expect(firstJson.idempotency_replay).toBe(true);
    expect(firstJson.api_key).toBeNull();
    expect(recordActivityMock).not.toHaveBeenCalled();
  });

  it("denies self-service production credentials", async () => {
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "https://shop.example.com/callback",
      environment: "production",
    }));
    expect(res.status).toBe(403);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("production_denied");
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("never repeats a raw key in the application object", async () => {
    const { POST } = await import("@/app/api/developers/integration-studio/route");
    const res = await POST(post({
      application_name: "Retail sandbox",
      policy_template_id: "age_21_retail",
      return_url: "http://localhost:3000/callback",
    }));
    const json = await res.json() as { api_key: string; application: Record<string, unknown> };
    expect(json.application).not.toHaveProperty("api_key");
    expect(JSON.stringify(json.application)).not.toContain("once_only_secret");
    const withoutKey = { ...json, api_key: null };
    expect(studioPayloadLeaks(withoutKey).filter((needle) => needle !== "abx_")).toEqual([]);
  });
});
