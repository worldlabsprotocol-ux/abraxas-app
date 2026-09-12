// FILE: app/api/age-assurance/browse-reuse/route.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { SITE_URL } from "@/lib/siteUrl";

const mockRequireSession = vi.fn();
const mockRateLimit = vi.fn();
const mockValidateContext = vi.fn();
const mockReuse = vi.fn();

vi.mock("@/lib/assurance/ageProviders/routeHelpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/assurance/ageProviders/routeHelpers")>();
  return {
    ...actual,
    requireAgeAssuranceSession: (...args: unknown[]) => mockRequireSession(...args),
    validateAgeAssurancePartnerContext: (...args: unknown[]) => mockValidateContext(...args),
  };
});

vi.mock("@/lib/partner/partnerFlowRouteGuard", () => ({
  enforcePartnerFlowRateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

vi.mock("@/lib/assurance/selfAttestation/reuseBrowseSelfAttestation", () => ({
  reuseBrowseSelfAttestation: (...args: unknown[]) => mockReuse(...args),
  buildBrowseReturnUrl: vi.fn(() => "https://www.goodtroublecanna.com/browse-verification-result?browse_receipt=jwt"),
}));

import { POST } from "./route";

const RETURN_URL = "https://www.goodtroublecanna.com/browse-verification-result";
const HOLDER = "0x0000000000000000000000000000000000000000000000000000000000000001";

function browseReuseRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("https://example.test/api/age-assurance/browse-reuse", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/age-assurance/browse-reuse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "development");
    mockRateLimit.mockResolvedValue(null);
    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: HOLDER },
    });
    mockValidateContext.mockResolvedValue({ ok: true, threshold: 21 });
    mockReuse.mockResolvedValue({
      ok: true,
      browse_receipt: "jwt-token",
      browse_receipt_id: "br_existing",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      age_band: "over_21",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects disallowed origin before session processing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const res = await POST(browseReuseRequest(
      {
        partner_id: GOOD_TROUBLE_PARTNER_ID,
        policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
        return_url: RETURN_URL,
      },
      { origin: "https://attacker.example" },
    ));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, code: "origin_not_allowed" });
    expect(mockRequireSession).not.toHaveBeenCalled();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("requires authentication after origin check", async () => {
    mockRequireSession.mockResolvedValue({
      ok: false,
      error: "Authentication required",
      status: 401,
    });

    const res = await POST(browseReuseRequest({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return_url: RETURN_URL,
    }));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: "auth_required" });
    expect(mockValidateContext).not.toHaveBeenCalled();
  });

  it("rejects invalid partner, policy, or return URL", async () => {
    mockValidateContext.mockResolvedValue({
      ok: false,
      code: "return_url_not_allowed",
      error: "return_url not allowlisted",
    });

    const res = await POST(browseReuseRequest({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return_url: "https://evil.example/callback",
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "return_url_not_allowed" });
    expect(mockReuse).not.toHaveBeenCalled();
  });

  it("returns 404 when no reusable browse proof exists", async () => {
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });

    const res = await POST(browseReuseRequest({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return_url: RETURN_URL,
    }));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ ok: false, code: "no_reusable_browse_proof" });
  });

  it("reuses valid browse proof without exposing DOB", async () => {
    const res = await POST(browseReuseRequest({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return_url: RETURN_URL,
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      age_band: "over_21",
      browse_receipt: "jwt-token",
      browse_receipt_id: "br_existing",
      redirect_url: expect.stringContaining("browse_receipt=jwt"),
    });
    expect(JSON.stringify(json)).not.toMatch(/date_of_birth|"dob"/i);
    expect(mockReuse).toHaveBeenCalledWith({
      holderRef: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    });
  });
});
