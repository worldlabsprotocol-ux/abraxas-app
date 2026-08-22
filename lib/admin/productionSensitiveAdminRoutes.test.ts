// FILE: lib/admin/productionSensitiveAdminRoutes.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";
import { ACTIVATE_PROMOTION_CHECK_KEYS } from "@/lib/admin/partnerProductionEnvPromotion";
import {
  evaluatePartnerProvisioningPreflight,
  PROVISIONING_PREFLIGHT_KEYS,
  type PartnerProvisioningPreflightDeps,
} from "@/lib/admin/partnerProvisioningPreflight";
import { parseProvisioningPreflightResponse } from "@/lib/admin/partnerFlowReadinessUi";
import { ADMIN_SESSION_COOKIE, adminSessionCookieValue } from "@/lib/adminAuth";

const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const promoteDesignPartnerApplicationMock = vi.hoisted(() => vi.fn());
const loadPartnerOnboardingRecordsMock = vi.hoisted(() => vi.fn());
const requireSupabaseAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@/lib/partner/promoteDesignPartner", () => ({
  promoteDesignPartnerApplication: (...args: unknown[]) => promoteDesignPartnerApplicationMock(...args),
}));

vi.mock("@/lib/admin/partnerOnboardingService", () => ({
  loadPartnerOnboardingRecords: (...args: unknown[]) => loadPartnerOnboardingRecordsMock(...args),
  loadPartnerOnboardingRecord: vi.fn(),
  enrichPartnerOnboardingDetail: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: (...args: unknown[]) => requireSupabaseAdminMock(...args),
}));

function buildSupabaseChain() {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: maybeSingleMock,
    insert: insertMock,
    update: updateMock,
    single: vi.fn(),
    in: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.limit.mockResolvedValue({ data: [], error: null });
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.single.mockResolvedValue({ data: { partner_id: "demo-partner" }, error: null });
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => buildSupabaseChain()),
  })),
}));

import { GET as partnersGET, POST as partnersPOST, PATCH as partnersPATCH } from "@/app/api/admin/partners/route";
import { GET as partnerKeysGET } from "@/app/api/admin/partner-keys/route";
import { GET as onboardingGET, POST as onboardingPOST } from "@/app/api/admin/partners/onboarding/route";
import { POST as returnUrlsPOST } from "@/app/api/admin/partners/onboarding/return-urls/route";
import { POST as policiesPOST } from "@/app/api/admin/partners/onboarding/policies/route";
import { POST as promotePOST } from "@/app/api/admin/design-partners/promote/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";
const RETURN_URL = "https://abraxasworld.xyz/good-trouble/enter";

function productionEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubEnv("ABRAXAS_BROWSER_SESSION_SECRET", "browser-session-secret");
}

function demoEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
}

function sessionHeaders(): HeadersInit {
  return { cookie: "abraxas_browser_session=test-token" };
}

function pinHeaders(): HeadersInit {
  return { "x-admin-pin": "test-admin-pin" };
}

function pinCookieHeaders(): HeadersInit {
  const token = adminSessionCookieValue();
  return token ? { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } : {};
}

function readyPartnerRow(overrides: Partial<{
  assigned_policy_id: string | null;
  onboarding_checklist: unknown;
  allowed_return_urls: string[];
}> = {}) {
  return {
    partner_id: PARTNER_ID,
    status: "pilot",
    allowed_return_urls: [RETURN_URL],
    is_external: true,
    onboarding_checklist: {},
    assigned_policy_id: POLICY_ID,
    ...overrides,
  };
}

function readyPolicyContext(overrides: Partial<{
  familyExists: boolean;
  activeCount: number;
  activePolicy: {
    id: string;
    partner_id: string;
    status: string;
    rules_json: Record<string, unknown> | null;
  } | null;
}> = {}) {
  return {
    familyExists: true,
    activeCount: 1,
    activePolicy: {
      id: POLICY_ID,
      partner_id: PARTNER_ID,
      status: "active",
      rules_json: {},
    },
    ...overrides,
  };
}

function preflightDeps(
  partner: ReturnType<typeof readyPartnerRow> | null,
  policyContext: ReturnType<typeof readyPolicyContext>,
  allowlisted = true,
): PartnerProvisioningPreflightDeps {
  return {
    loadPartner: vi.fn(async () => partner),
    loadPolicyActivationContext: vi.fn(async () => policyContext),
    isReturnUrlAllowed: vi.fn(async () => allowlisted),
  };
}

describe("production-sensitive admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBrowserSessionMock.mockResolvedValue(null);
    maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" }, error: null });
    loadPartnerOnboardingRecordsMock.mockResolvedValue([]);
    requireSupabaseAdminMock.mockReturnValue({ from: vi.fn(() => buildSupabaseChain()) });
    promoteDesignPartnerApplicationMock.mockResolvedValue({
      partner_id: PARTNER_ID,
      company: "Good Trouble",
      api_key: "secret",
      key_prefix: "abx_test_",
      application_id: "app-1",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("existing partner-keys guard", () => {
    it("returns 401 for PIN-only requests on Production origin", async () => {
      productionEnv();
      const req = new NextRequest("http://localhost/api/admin/partner-keys", {
        headers: pinHeaders(),
      });
      const res = await partnerKeysGET(req);
      expect(res.status).toBe(401);
    });

    it("preserves PIN-based access on Demo origin", async () => {
      demoEnv();
      const req = new NextRequest("http://localhost/api/admin/partner-keys", {
        headers: pinHeaders(),
      });
      const res = await partnerKeysGET(req);
      expect(res.status).not.toBe(401);
    });
  });

  describe("A — Production auth: PIN blocked", () => {
    beforeEach(() => {
      productionEnv();
    });

    it("returns 401 for PIN header on partners GET", async () => {
      const res = await partnersGET(new NextRequest("http://localhost/api/admin/partners", { headers: pinHeaders() }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on partners POST", async () => {
      const res = await partnersPOST(new NextRequest("http://localhost/api/admin/partners", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: PARTNER_ID, company: "Co" }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on partners PATCH", async () => {
      const res = await partnersPATCH(new NextRequest("http://localhost/api/admin/partners", {
        method: "PATCH",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: PARTNER_ID, status: "pilot" }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on onboarding GET", async () => {
      const res = await onboardingGET(new NextRequest("http://localhost/api/admin/partners/onboarding", { headers: pinHeaders() }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on onboarding POST", async () => {
      const res = await onboardingPOST(new NextRequest("http://localhost/api/admin/partners/onboarding", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: PARTNER_ID, company: "Co" }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on return-urls POST", async () => {
      const res = await returnUrlsPOST(new NextRequest("http://localhost/api/admin/partners/onboarding/return-urls", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: PARTNER_ID, return_urls: [RETURN_URL] }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on policies POST", async () => {
      const res = await policiesPOST(new NextRequest("http://localhost/api/admin/partners/onboarding/policies", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", partner_id: PARTNER_ID, policy_id: POLICY_ID, version: 1 }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN header on promote POST", async () => {
      const res = await promotePOST(new NextRequest("http://localhost/api/admin/design-partners/promote", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ application_id: "app-1" }),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN cookie on partners GET", async () => {
      const res = await partnersGET(new NextRequest("http://localhost/api/admin/partners", {
        headers: pinCookieHeaders(),
      }));
      expect(res.status).toBe(401);
    });

    it("returns 401 for PIN cookie on onboarding GET", async () => {
      const res = await onboardingGET(new NextRequest("http://localhost/api/admin/partners/onboarding", {
        headers: pinCookieHeaders(),
      }));
      expect(res.status).toBe(401);
    });
  });

  describe("B/C — Production auth: allowlisted session allowed", () => {
    beforeEach(() => {
      productionEnv();
      resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    });

    it("allows partners GET with allowlisted browser session", async () => {
      const res = await partnersGET(new NextRequest("http://localhost/api/admin/partners", { headers: sessionHeaders() }));
      expect(res.status).not.toBe(401);
    });

    it("allows onboarding GET with allowlisted browser session", async () => {
      const res = await onboardingGET(new NextRequest("http://localhost/api/admin/partners/onboarding", { headers: sessionHeaders() }));
      expect(res.status).not.toBe(401);
    });

    it("allows partners GET when session and PIN header are both present", async () => {
      const res = await partnersGET(new NextRequest("http://localhost/api/admin/partners", {
        headers: { ...sessionHeaders(), ...pinHeaders() },
      }));
      expect(res.status).not.toBe(401);
    });

    it("allows onboarding GET when session and PIN header are both present", async () => {
      const res = await onboardingGET(new NextRequest("http://localhost/api/admin/partners/onboarding", {
        headers: { ...sessionHeaders(), ...pinHeaders() },
      }));
      expect(res.status).not.toBe(401);
    });
  });

  describe("D — Demo preserves PIN access", () => {
    beforeEach(() => {
      demoEnv();
    });

    it("allows partners GET with PIN header", async () => {
      const res = await partnersGET(new NextRequest("http://localhost/api/admin/partners", { headers: pinHeaders() }));
      expect(res.status).not.toBe(401);
    });

    it("allows partners POST with PIN header", async () => {
      const res = await partnersPOST(new NextRequest("http://localhost/api/admin/partners", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: PARTNER_ID, company: "Co" }),
      }));
      expect(res.status).not.toBe(401);
    });

    it("allows onboarding GET with PIN header", async () => {
      const res = await onboardingGET(new NextRequest("http://localhost/api/admin/partners/onboarding", { headers: pinHeaders() }));
      expect(res.status).not.toBe(401);
    });

    it("allows onboarding POST with PIN header", async () => {
      const res = await onboardingPOST(new NextRequest("http://localhost/api/admin/partners/onboarding", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: PARTNER_ID, company: "Co" }),
      }));
      expect(res.status).not.toBe(401);
    });

    it("allows promote POST with PIN header and issue_live true", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "app-1", company: "Co" }, error: null });
      const res = await promotePOST(new NextRequest("http://localhost/api/admin/design-partners/promote", {
        method: "POST",
        headers: { ...pinHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ application_id: "app-1", issue_live: true }),
      }));
      expect(res.status).not.toBe(403);
    });
  });

  describe("E — Production bypass blocked", () => {
    beforeEach(() => {
      productionEnv();
      resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
      maybeSingleMock.mockReset();
      maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" }, error: null });
    });

    it("rejects partners POST with allowed_environments on Production", async () => {
      const res = await partnersPOST(new NextRequest("http://localhost/api/admin/partners", {
        method: "POST",
        headers: { ...sessionHeaders(), "content-type": "application/json" },
        body: JSON.stringify({
          partner_id: PARTNER_ID,
          company: "Co",
          allowed_environments: ["sandbox", "production"],
        }),
      }));
      expect(res.status).toBe(403);
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("rejects partners PATCH with allowed_environments on Production", async () => {
      const res = await partnersPATCH(new NextRequest("http://localhost/api/admin/partners", {
        method: "PATCH",
        headers: { ...sessionHeaders(), "content-type": "application/json" },
        body: JSON.stringify({
          partner_id: PARTNER_ID,
          allowed_environments: ["sandbox", "production"],
        }),
      }));
      expect(res.status).toBe(403);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("rejects onboarding POST with allowed_environments on Production", async () => {
      const res = await onboardingPOST(new NextRequest("http://localhost/api/admin/partners/onboarding", {
        method: "POST",
        headers: { ...sessionHeaders(), "content-type": "application/json" },
        body: JSON.stringify({
          partner_id: PARTNER_ID,
          company: "Co",
          allowed_environments: ["sandbox", "production"],
        }),
      }));
      expect(res.status).toBe(403);
    });

    it("rejects promote POST with issue_live true on Production", async () => {
      const res = await promotePOST(new NextRequest("http://localhost/api/admin/design-partners/promote", {
        method: "POST",
        headers: { ...sessionHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ application_id: "app-1", issue_live: true }),
      }));
      expect(res.status).toBe(403);
      expect(promoteDesignPartnerApplicationMock).not.toHaveBeenCalled();
    });
  });

  describe("F — preflight RPC parity", () => {
    it("exposes the activate promotion key set plus ok", () => {
      expect(PROVISIONING_PREFLIGHT_KEYS.size).toBe(ACTIVATE_PROMOTION_CHECK_KEYS.length + 1);
      for (const key of ACTIVATE_PROMOTION_CHECK_KEYS) {
        expect(PROVISIONING_PREFLIGHT_KEYS.has(key)).toBe(true);
      }
    });

    it("fails policy_assigned_match when assigned_policy_id mismatches", async () => {
      const report = await evaluatePartnerProvisioningPreflight(
        { partnerId: PARTNER_ID, policyId: POLICY_ID, returnUrl: RETURN_URL },
        preflightDeps(readyPartnerRow({ assigned_policy_id: "other-policy" }), readyPolicyContext()),
      );
      expect(report.policy_assigned_match).toBe(false);
      expect(report.ok).toBe(false);
    });

    it("fails policy_active when zero active versions exist", async () => {
      const report = await evaluatePartnerProvisioningPreflight(
        { partnerId: PARTNER_ID, policyId: POLICY_ID, returnUrl: RETURN_URL },
        preflightDeps(readyPartnerRow(), readyPolicyContext({ activeCount: 0, activePolicy: null })),
      );
      expect(report.policy_active).toBe(false);
      expect(report.policy_partner_match).toBe(false);
      expect(report.ok).toBe(false);
    });

    it("fails policy_active when multiple active versions exist", async () => {
      const report = await evaluatePartnerProvisioningPreflight(
        { partnerId: PARTNER_ID, policyId: POLICY_ID, returnUrl: RETURN_URL },
        preflightDeps(readyPartnerRow(), readyPolicyContext({ activeCount: 2, activePolicy: null })),
      );
      expect(report.policy_active).toBe(false);
      expect(report.policy_partner_match).toBe(false);
      expect(report.ok).toBe(false);
    });

    it("fails all_stored_return_urls_compliant for HTTP stored URLs", async () => {
      const report = await evaluatePartnerProvisioningPreflight(
        { partnerId: PARTNER_ID, policyId: POLICY_ID, returnUrl: RETURN_URL },
        preflightDeps(
          readyPartnerRow({ allowed_return_urls: ["http://insecure.example/callback"] }),
          readyPolicyContext(),
        ),
      );
      expect(report.all_stored_return_urls_compliant).toBe(false);
      expect(report.ok).toBe(false);
    });

    it("fails onboarding_fields_present when onboarding_checklist is null", async () => {
      const report = await evaluatePartnerProvisioningPreflight(
        { partnerId: PARTNER_ID, policyId: POLICY_ID, returnUrl: RETURN_URL },
        preflightDeps(readyPartnerRow({ onboarding_checklist: null }), readyPolicyContext()),
      );
      expect(report.onboarding_fields_present).toBe(false);
      expect(report.ok).toBe(false);
    });

    it("passes when all activate promotion checks are true", async () => {
      const report = await evaluatePartnerProvisioningPreflight(
        { partnerId: PARTNER_ID, policyId: POLICY_ID, returnUrl: RETURN_URL },
        preflightDeps(readyPartnerRow(), readyPolicyContext()),
      );
      for (const key of ACTIVATE_PROMOTION_CHECK_KEYS) {
        expect(report[key], key).toBe(true);
      }
      expect(report.ok).toBe(true);
    });

    it("parses the expanded preflight payload in the readiness UI", () => {
      const payload = Object.fromEntries(
        Array.from(PROVISIONING_PREFLIGHT_KEYS).map((key) => [key, key === "ok"]),
      ) as Record<string, boolean>;
      payload.ok = false;
      for (const key of ACTIVATE_PROMOTION_CHECK_KEYS) {
        payload[key] = true;
      }
      const parsed = parseProvisioningPreflightResponse(payload);
      expect(parsed.return_url_request_allowlisted).toBe(true);
      expect(parsed.all_stored_return_urls_compliant).toBe(true);
      expect(parsed.policy_assigned_match).toBe(true);
    });
  });

  it("leaves demo sandbox guard on PIN-based checkAdmin only", () => {
    const source = readFileSync(
      resolve(__dirname, "../demo/partnerSandboxDemoRouteGuard.ts"),
      "utf8",
    );
    expect(source).toContain("checkAdmin");
    expect(source).not.toContain("checkProductionSensitiveAdminAccess");
  });
});
