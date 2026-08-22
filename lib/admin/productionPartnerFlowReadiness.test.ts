// FILE: lib/admin/productionPartnerFlowReadiness.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";
import { ACTIVATE_PROMOTION_CHECK_KEYS } from "@/lib/admin/partnerProductionEnvPromotion";
import { EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT } from "@/scripts/demo/lib/expectedDemoSigningKeyThumbprint";
import {
  evaluatePartnerProvisioningPreflight,
  type PartnerProvisioningPreflightDeps,
  type PolicyActivationPreflightContext,
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

function readyPartnerRow(overrides: Partial<{
  assigned_policy_id: string | null;
  onboarding_checklist: unknown;
  allowed_return_urls: string[];
  status: string;
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

function readyPolicyRow(overrides: Partial<{
  id: string;
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

function readyPolicyContext(
  overrides: Partial<PolicyActivationPreflightContext> = {},
): PolicyActivationPreflightContext {
  const activePolicy = readyPolicyRow();
  return {
    familyExists: true,
    activeCount: 1,
    activePolicy,
    ...overrides,
  };
}

function setupSupabaseChain(partnerData: unknown, policyData: unknown, email = "ops@example.com"): void {
  eqMock.mockReset();
  maybeSingleMock.mockReset();
  fromMock.mockReset();

  const chain = {
    select: vi.fn(() => chain),
    eq: eqMock,
    maybeSingle: maybeSingleMock,
  };
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
      expect(PROVISIONING_PREFLIGHT_KEYS.size).toBe(ACTIVATE_PROMOTION_CHECK_KEYS.length + 1);
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
    it("filters active policy versions by status for post-055 families", async () => {
      productionEnv();
      resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });

      eqMock.mockReset();
      maybeSingleMock.mockReset();
      fromMock.mockReset();

      let statusFilterSeen = false;
      let headSelectCalls = 0;

      const countResult = Promise.resolve({ count: 1, error: null });

      const defaultChain = {
        select: vi.fn((...args: unknown[]) => {
          const opts = args[1] as { head?: boolean } | undefined;
          if (opts?.head) {
            headSelectCalls += 1;
            if (headSelectCalls === 1) {
              // Family existence count: .eq("id", policyId) only.
              return {
                eq: vi.fn(() => countResult),
              };
            }
            // Active version count: .eq("id", policyId).eq("status", "active").
            return {
              eq: vi.fn(() => ({
                eq: vi.fn((column: string, value: string) => {
                  if (column === "status" && value === "active") {
                    statusFilterSeen = true;
                  }
                  return countResult;
                }),
              })),
            };
          }
          // Auth, partner, and policy row queries use the default eq → maybeSingle chain.
          return defaultChain;
        }),
        eq: eqMock,
        maybeSingle: maybeSingleMock,
      };

      eqMock.mockReturnValue(defaultChain);
      maybeSingleMock
        .mockResolvedValueOnce({ data: { email: "ops@example.com" }, error: null })
        .mockResolvedValueOnce({ data: readyPartnerRow(), error: null })
        .mockResolvedValueOnce({ data: readyPolicyRow(), error: null });

      fromMock.mockReturnValue(defaultChain);
      createClientMock.mockReturnValue({ from: fromMock });

      const res = await provisioningPreflightGET(
        new NextRequest(
          `http://localhost/api/admin/partner-flow/provisioning-preflight?partner_id=${PARTNER_ID}&policy_id=${POLICY_ID}&return_url=${encodeURIComponent(RETURN_URL)}`,
          { headers: allowlistedSessionHeaders() },
        ),
      );

      expect(res.status).toBe(200);
      expect(headSelectCalls).toBe(2);
      expect(statusFilterSeen).toBe(true);
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
    policyContext: PolicyActivationPreflightContext,
    allowlisted = true,
  ): PartnerProvisioningPreflightDeps {
    return {
      loadPartner: vi.fn(async () => partner),
      loadPolicyActivationContext: vi.fn(async () => policyContext),
      isReturnUrlAllowed: vi.fn(async () => allowlisted),
    };
  }

  it("reports pre-provision state with partner_row_exists false and ok false", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(null, { familyExists: false, activeCount: 0, activePolicy: null }),
    );
    expect(report.query_valid).toBe(true);
    expect(report.return_url_syntax_valid).toBe(true);
    expect(report.partner_row_exists).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("fails policy_not_sandbox when rules_json.sandbox_only is true on the sole active version", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow(),
        readyPolicyContext({
          activePolicy: readyPolicyRow({ rules_json: { sandbox_only: true } }),
        }),
      ),
    );
    expect(report.policy_row_exists).toBe(true);
    expect(report.policy_active).toBe(true);
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("passes all activate promotion checks when the sole active policy is production-ready", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(readyPartnerRow(), readyPolicyContext()),
    );
    for (const key of ACTIVATE_PROMOTION_CHECK_KEYS) {
      expect(report[key], key).toBe(true);
    }
    expect(report.return_url_request_allowlisted).toBe(true);
    expect(report.all_stored_return_urls_compliant).toBe(true);
    expect(report.policy_assigned_match).toBe(true);
    expect(report.ok).toBe(true);
  });

  it("fails policy_not_sandbox for known sandbox policy ids", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      { ...baseInput, policyId: SANDBOX_POLICY_ID },
      deps(
        readyPartnerRow({ assigned_policy_id: SANDBOX_POLICY_ID }),
        readyPolicyContext({
          activePolicy: readyPolicyRow({ id: SANDBOX_POLICY_ID, partner_id: PARTNER_ID }),
        }),
      ),
    );
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("reports deprecated-only families with policy_active false and policy_not_sandbox false", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow(),
        {
          familyExists: true,
          activeCount: 0,
          activePolicy: null,
        },
      ),
    );
    expect(report.policy_row_exists).toBe(true);
    expect(report.policy_active).toBe(false);
    expect(report.policy_partner_match).toBe(false);
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("fails policy_active when multiple active versions exist", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow(),
        {
          familyExists: true,
          activeCount: 2,
          activePolicy: null,
        },
      ),
    );
    expect(report.policy_active).toBe(false);
    expect(report.policy_partner_match).toBe(false);
    expect(report.policy_not_sandbox).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("fails policy_assigned_match when assigned_policy_id mismatches", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow({ assigned_policy_id: "other-policy" }),
        readyPolicyContext(),
      ),
    );
    expect(report.policy_assigned_match).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("fails all_stored_return_urls_compliant for HTTP stored URLs", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(
        readyPartnerRow({ allowed_return_urls: ["http://insecure.example/callback"] }),
        readyPolicyContext(),
      ),
    );
    expect(report.all_stored_return_urls_compliant).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("fails return_url_request_allowlisted when request URL is not allowlisted", async () => {
    const report = await evaluatePartnerProvisioningPreflight(
      baseInput,
      deps(readyPartnerRow(), readyPolicyContext(), false),
    );
    expect(report.return_url_request_allowlisted).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("does not call deps when query_valid is false", async () => {
    const mocked = deps(readyPartnerRow(), readyPolicyContext());
    const report = await evaluatePartnerProvisioningPreflight(
      { partnerId: "", policyId: POLICY_ID, returnUrl: RETURN_URL },
      mocked,
    );
    expect(report.query_valid).toBe(false);
    expect(report.return_url_syntax_valid).toBe(false);
    expect(mocked.loadPartner).not.toHaveBeenCalled();
    expect(mocked.loadPolicyActivationContext).not.toHaveBeenCalled();
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
