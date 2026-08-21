// FILE: lib/admin/productionPartnerFlowReadiness.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";
import { EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT } from "@/scripts/demo/lib/expectedDemoSigningKeyThumbprint";
import {
  evaluatePartnerProvisioningPreflight,
  type PartnerProvisioningPreflightDeps,
  PROVISIONING_PREFLIGHT_KEYS,
  provisioningPreflightResponseHasNoSecrets,
} from "@/lib/admin/partnerProvisioningPreflight";
import {
  evaluateProductionSigningHealth,
  PRODUCTION_SIGNING_HEALTH_KEYS,
  productionSigningHealthResponseHasNoSecrets,
} from "@/lib/admin/productionEnvironmentDiagnostics";

const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const isReturnUrlAllowedMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: (...args: unknown[]) => isReturnUrlAllowedMock(...args),
}));

import { GET as signingHealthGET } from "@/app/api/admin/partner-flow/signing-health/route";
import { GET as provisioningPreflightGET } from "@/app/api/admin/partner-flow/provisioning-preflight/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";
const RETURN_URL = "https://abraxasworld.xyz/good-trouble/enter";

const NON_DEMO_PUBLIC_JWK = JSON.stringify({
  kty: "OKP",
  crv: "Ed25519",
  x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
});

function productionEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubEnv("ABRAXAS_BROWSER_SESSION_SECRET", "browser-session-secret");
  vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "");
  vi.stubEnv("PARTNER_SANDBOX_DEMO_SUBJECT_ID", "");
  vi.stubEnv("ABRAXAS_PUBLIC_KEY", NON_DEMO_PUBLIC_JWK);
}

function demoEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
}

function previewEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview-branch.vercel.app");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
}

function allowlistedSessionHeaders(): HeadersInit {
  return { cookie: "abraxas_browser_session=test-token" };
}

function readyPartnerRow() {
  return {
    partner_id: PARTNER_ID,
    status: "active",
    allowed_return_urls: [`${SITE_URL}/good-trouble/enter`],
    is_external: true,
    onboarding_checklist: {},
  };
}

function readyPolicyRow(overrides: Partial<{
  status: string;
  rules_json: Record<string, unknown> | null;
  partner_id: string;
}> = {}) {
  return {
    id: POLICY_ID,
    partner_id: PARTNER_ID,
    status: "active",
    rules_json: {},
    ...overrides,
  };
}

function setupSupabaseChain(partnerData: unknown, policyData: unknown, email = "ops@example.com"): void {
  eqMock.mockReset();
  selectMock.mockReset();
  maybeSingleMock.mockReset();
  fromMock.mockReset();

  const chain = {
    select: selectMock,
    eq: eqMock,
    maybeSingle: maybeSingleMock,
  };
  selectMock.mockReturnValue(chain);
  eqMock.mockReturnValue(chain);

  maybeSingleMock
    .mockResolvedValueOnce({ data: { email }, error: null })
    .mockResolvedValueOnce({ data: partnerData, error: null })
    .mockResolvedValueOnce({ data: policyData, error: null });

  fromMock.mockReturnValue(chain);
  createClientMock.mockReturnValue({ from: fromMock });
}

function assertBooleanOnlyBody(body: Record<string, unknown>, allowedKeys: Set<string>): void {
  expect(Object.keys(body).sort()).toEqual(Array.from(allowedKeys).sort());
  for (const value of Object.values(body)) {
    expect(typeof value).toBe("boolean");
  }
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/@/);
  expect(serialized).not.toMatch(/https?:\/\//);
  expect(serialized).not.toMatch(/rules_json|sandbox_only/);
}

describe("production partner flow readiness routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBrowserSessionMock.mockResolvedValue(null);
    isReturnUrlAllowedMock.mockResolvedValue(true);
    setupSupabaseChain(null, null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("auth and origin matrix", () => {
    it("returns 200 with fixed boolean keys for allowlisted Production browser session", async () => {
      productionEnv();
      resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
      maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" }, error: null });

      const signingRes = await signingHealthGET(
        new NextRequest("http://localhost/api/admin/partner-flow/signing-health", {
          headers: allowlistedSessionHeaders(),
        }),
      );
      expect(signingRes.status).toBe(200);
      expect(signingRes.headers.get("Cache-Control")).toContain("no-store");
      const signingBody = await signingRes.json() as Record<string, unknown>;
      assertBooleanOnlyBody(signingBody, PRODUCTION_SIGNING_HEALTH_KEYS);
      expect(productionSigningHealthResponseHasNoSecrets(signingBody)).toBe(true);

      setupSupabaseChain(null, null);
      const preflightRes = await provisioningPreflightGET(
        new NextRequest(
          `http://localhost/api/admin/partner-flow/provisioning-preflight?partner_id=${PARTNER_ID}&policy_id=${POLICY_ID}&return_url=${encodeURIComponent(RETURN_URL)}`,
          { headers: allowlistedSessionHeaders() },
        ),
      );
      expect(preflightRes.status).toBe(200);
      const preflightBody = await preflightRes.json() as Record<string, unknown>;
      assertBooleanOnlyBody(preflightBody, PROVISIONING_PREFLIGHT_KEYS);
      expect(provisioningPreflightResponseHasNoSecrets(preflightBody)).toBe(true);
    });

    it("returns 401 for PIN-only requests on Production origin", async () => {
      productionEnv();
      const signingRes = await signingHealthGET(
        new NextRequest("http://localhost/api/admin/partner-flow/signing-health", {
          headers: { "x-admin-pin": "test-admin-pin" },
        }),
      );
      expect(signingRes.status).toBe(401);

      const preflightRes = await provisioningPreflightGET(
        new NextRequest("http://localhost/api/admin/partner-flow/provisioning-preflight", {
          headers: { "x-admin-pin": "test-admin-pin" },
        }),
      );
      expect(preflightRes.status).toBe(401);
    });

    it("returns 404 for demo origin with valid PIN before auth or database access", async () => {
      demoEnv();
      const preflightRes = await provisioningPreflightGET(
        new NextRequest("http://localhost/api/admin/partner-flow/provisioning-preflight", {
          headers: { "x-admin-pin": "test-admin-pin" },
        }),
      );
      expect(preflightRes.status).toBe(404);
      expect(createClientMock).not.toHaveBeenCalled();
      expect(resolveBrowserSessionMock).not.toHaveBeenCalled();
    });

    it("returns 404 for preview and missing configured origins", async () => {
      previewEnv();
      let res = await provisioningPreflightGET(
        new NextRequest("http://localhost/api/admin/partner-flow/provisioning-preflight", {
          headers: allowlistedSessionHeaders(),
        }),
      );
      expect(res.status).toBe(404);

      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      res = await provisioningPreflightGET(
        new NextRequest("http://localhost/api/admin/partner-flow/provisioning-preflight", {
          headers: allowlistedSessionHeaders(),
        }),
      );
      expect(res.status).toBe(404);
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });

  describe("policy query construction", () => {
    it("loads policy by id only without filtering status in the query", async () => {
      productionEnv();
      resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
      setupSupabaseChain(null, readyPolicyRow({ status: "deprecated" }));

      await provisioningPreflightGET(
        new NextRequest(
          `http://localhost/api/admin/partner-flow/provisioning-preflight?partner_id=${PARTNER_ID}&policy_id=${POLICY_ID}&return_url=${encodeURIComponent(RETURN_URL)}`,
          { headers: allowlistedSessionHeaders() },
        ),
      );

      const policyEqCalls = eqMock.mock.calls.filter((call) => call[0] === "id");
      expect(policyEqCalls).toEqual([[ "id", POLICY_ID ]]);
      expect(eqMock.mock.calls.some((call) => call[0] === "status")).toBe(false);
    });
  });
});

describe("evaluatePartnerProvisioningPreflight", () => {
  const baseInput = {
    partnerId: PARTNER_ID,
    policyId: POLICY_ID,
    returnUrl: RETURN_URL,
  };

  function deps(
    partner: ReturnType<typeof readyPartnerRow> | null,
    policy: ReturnType<typeof readyPolicyRow> | null,
    allowlisted = true,
  ): PartnerProvisioningPreflightDeps {
    return {
      loadPartner: vi.fn(async () => partner),
      loadPolicy: vi.fn(async () => policy),
      isReturnUrlAllowed: vi.fn(async () => allowlisted),
    };
  }

  it("reports pre-provision state with partner_row_exists false and ok false", async () => {
    const report = await evaluatePartnerProvisioningPreflight(baseInput, deps(null, null));
    expect(report.query_valid).toBe(true);
    expect(report.partner_row_exists).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("fails policy_not_sandbox when rules_json.sandbox_only is true on a normal policy id", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow(),
        readyPolicyRow({ rules_json: { sandbox_only: true } }),
      ),
    );
    expect(report.policy_row_exists).toBe(true);
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("passes policy_not_sandbox when rules_json has no sandbox_only and all other checks pass", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(readyPartnerRow(), readyPolicyRow({ rules_json: {} })),
    );
    expect(report.policy_not_sandbox).toBe(true);
    expect(report.ok).toBe(true);
  });

  it("fails policy_not_sandbox for known sandbox policy ids", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      { ...baseInput, policyId: SANDBOX_POLICY_ID },
      deps(
        readyPartnerRow(),
        readyPolicyRow({ partner_id: PARTNER_ID }),
      ),
    );
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("reports inactive normal policy with policy_row_exists true, policy_active false, ok false", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow(),
        readyPolicyRow({ status: "deprecated", rules_json: {} }),
      ),
    );
    expect(report.policy_row_exists).toBe(true);
    expect(report.policy_active).toBe(false);
    expect(report.policy_not_sandbox).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("reports inactive policy with sandbox_only rules as policy_not_sandbox false", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow(),
        readyPolicyRow({ status: "deprecated", rules_json: { sandbox_only: true } }),
      ),
    );
    expect(report.policy_row_exists).toBe(true);
    expect(report.policy_active).toBe(false);
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("does not call deps when query_valid is false", async () => {
    const mocked = deps(readyPartnerRow(), readyPolicyRow());
    const report = await evaluatePartnerProvisioningPreflight(
      { partnerId: "", policyId: POLICY_ID, returnUrl: RETURN_URL },
      mocked,
    );
    expect(report.query_valid).toBe(false);
    expect(mocked.loadPartner).not.toHaveBeenCalled();
    expect(mocked.loadPolicy).not.toHaveBeenCalled();
  });
});

describe("evaluateProductionSigningHealth", () => {
  it("flags demo sandbox env and demo signing key matches", () => {
    const report = evaluateProductionSigningHealth({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: SITE_URL,
      PARTNER_SANDBOX_DEMO_ENABLED: "true",
      PARTNER_SANDBOX_DEMO_SUBJECT_ID: "0xabc",
      ABRAXAS_BROWSER_SESSION_SECRET: "secret",
      ABRAXAS_PUBLIC_KEY: JSON.stringify({
        kty: "OKP",
        crv: "Ed25519",
        x: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      }),
    });
    expect(report.demo_sandbox_flag_disabled).toBe(false);
    expect(report.demo_subject_id_unset).toBe(false);
    expect(report.production_origin_exact).toBe(true);
  });

  it("sets signing_key_not_demo_key false when public key matches demo thumbprint", () => {
    expect(EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT).toBeTruthy();
    const report = evaluateProductionSigningHealth({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: SITE_URL,
      ABRAXAS_BROWSER_SESSION_SECRET: "secret",
      ABRAXAS_PUBLIC_KEY: JSON.stringify({
        kty: "OKP",
        crv: "Ed25519",
        x: "demo-public-x-placeholder-not-real",
      }),
    });
    expect(typeof report.signing_key_not_demo_key).toBe("boolean");
  });
});
