// FILE: lib/integration/preflight.test.ts

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runIntegrationPreflight } from "@/lib/integration/preflight";
import {
  configuredEnvUsesStaleHost,
  isProductionPreflightMode,
  resolvePreflightOptions,
} from "@/lib/integration/preflightConfig";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { SITE_URL } from "@/lib/siteUrl";
import type { PartnerPolicyRow, PartnerRow, PreflightDeps } from "@/lib/integration/preflightTypes";

const ROOT = process.cwd();
const STALE = "abraxas-app.vercel.app";

function baseDeps(overrides: Partial<PreflightDeps> = {}): PreflightDeps {
  return {
    fetch: vi.fn(),
    env: {},
    readFile: (path) => readFileSync(path, "utf8"),
    fileExists: (path) => existsSync(path),
    ...overrides,
  };
}

describe("resolvePreflightOptions", () => {
  it("defaults to Good Trouble pilot ids for documentation examples", () => {
    const opts = resolvePreflightOptions({});
    expect(opts.partnerId).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(opts.policyId).toBe(GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(opts.returnUrl).toBe(`${SITE_URL}/good-trouble/enter`);
  });

  it("detects production mode from canonical base URL", () => {
    expect(
      isProductionPreflightMode(SITE_URL, { INTEGRATION_PREFLIGHT_PRODUCTION_MODE: undefined }),
    ).toBe(true);
    expect(
      isProductionPreflightMode("https://preview.example.com", {
        INTEGRATION_PREFLIGHT_PRODUCTION_MODE: "true",
      }),
    ).toBe(true);
  });
});

describe("configuredEnvUsesStaleHost", () => {
  it("flags stale host in configured env vars", () => {
    const offenders = configuredEnvUsesStaleHost({
      NEXT_PUBLIC_APP_URL: `https://${STALE}`,
    });
    expect(offenders.some((o) => o.includes("NEXT_PUBLIC_APP_URL"))).toBe(true);
  });
});

describe("runIntegrationPreflight", () => {
  it("passes static migration and OpenAPI contract checks without network or Supabase", async () => {
    const result = await runIntegrationPreflight(
      {
        baseUrl: "",
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        returnUrl: `${SITE_URL}/good-trouble/enter`,
        productionMode: false,
      },
      baseDeps(),
      ROOT,
    );

    expect(result.summary.fail).toBe(0);
    expect(result.exitCode).toBe(0);
    expect(result.checks.some((c) => c.id === "partner-flow-receipt-contract" && c.status === "pass")).toBe(
      true,
    );
    expect(result.checks.filter((c) => c.status === "pending").length).toBeGreaterThan(0);
  });

  it("fails production mode when public-key issuer uses stale Vercel host", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/credentials/public-key")) {
        return new Response(
          JSON.stringify({ issuer: `https://${STALE}` }),
          { status: 200 },
        );
      }
      if (url.includes("/api/trust/status")) {
        return new Response(
          JSON.stringify({ infrastructure: { signing_configured: true } }),
          { status: 200 },
        );
      }
      if (url.endsWith("/openapi/partner-flow.openapi.yaml")) {
        return new Response(`servers:\n  - url: ${SITE_URL}`, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const result = await runIntegrationPreflight(
      {
        baseUrl: SITE_URL,
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        returnUrl: `${SITE_URL}/good-trouble/enter`,
        productionMode: true,
      },
      baseDeps({ fetch: fetchMock as typeof fetch }),
      ROOT,
    );

    const originCheck = result.checks.find((c) => c.id === "http-canonical-public-origin");
    expect(originCheck?.status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("passes production HTTP probes when issuer, signing, and OpenAPI are canonical", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/credentials/public-key")) {
        return new Response(JSON.stringify({ issuer: SITE_URL }), { status: 200 });
      }
      if (url.includes("/api/trust/status")) {
        return new Response(
          JSON.stringify({ infrastructure: { signing_configured: true } }),
          { status: 200 },
        );
      }
      if (url.endsWith("/openapi/partner-flow.openapi.yaml")) {
        const yaml = readFileSync(
          join(ROOT, "public/openapi/partner-flow.openapi.yaml"),
          "utf8",
        );
        return new Response(yaml, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const partner: PartnerRow = {
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      status: "pilot",
      allowed_return_urls: [`${SITE_URL}/good-trouble/enter`],
      is_external: true,
      onboarding_checklist: {},
      assigned_policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    };
    const policy: PartnerPolicyRow = {
      id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      status: "active",
    };

    const result = await runIntegrationPreflight(
      {
        baseUrl: SITE_URL,
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        returnUrl: `${SITE_URL}/good-trouble/enter`,
        productionMode: true,
      },
      baseDeps({
        fetch: fetchMock as typeof fetch,
        loadPartner: async () => partner,
        loadPolicy: async () => policy,
        isReturnUrlAllowed: async () => true,
      }),
      ROOT,
    );

    expect(result.summary.fail).toBe(0);
    expect(result.exitCode).toBe(0);
    expect(result.checks.find((c) => c.id === "http-canonical-public-origin")?.status).toBe("pass");
    expect(result.checks.find((c) => c.id === "http-trust-signing-enabled")?.status).toBe("pass");
    expect(result.checks.find((c) => c.id === "supabase-callback-allowlist-match")?.status).toBe("pass");
  });

  it("fails when partner policy is missing or inactive in production", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/credentials/public-key")) {
        return new Response(JSON.stringify({ issuer: SITE_URL }), { status: 200 });
      }
      if (url.includes("/api/trust/status")) {
        return new Response(
          JSON.stringify({ infrastructure: { signing_configured: true } }),
          { status: 200 },
        );
      }
      if (url.endsWith("/openapi/partner-flow.openapi.yaml")) {
        return new Response(`servers:\n  - url: ${SITE_URL}`, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const result = await runIntegrationPreflight(
      {
        baseUrl: SITE_URL,
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        returnUrl: `${SITE_URL}/good-trouble/enter`,
        productionMode: true,
      },
      baseDeps({
        fetch: fetchMock as typeof fetch,
        loadPartner: async () => ({
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          status: "pilot",
          allowed_return_urls: [`${SITE_URL}/good-trouble/enter`],
          is_external: true,
          onboarding_checklist: {},
          assigned_policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
        }),
        loadPolicy: async () => ({
          id: GOOD_TROUBLE_RETAIL_POLICY_ID,
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          status: "draft",
        }),
        isReturnUrlAllowed: async () => true,
      }),
      ROOT,
    );

    expect(result.checks.find((c) => c.id === "supabase-partner-policy-active")?.status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("does not trust raw forwarded-host for HTTP checks (uses fetch responses only)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ issuer: SITE_URL }), { status: 200 }),
    );

    await runIntegrationPreflight(
      {
        baseUrl: SITE_URL,
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        returnUrl: `${SITE_URL}/good-trouble/enter`,
        productionMode: true,
      },
      baseDeps({ fetch: fetchMock as typeof fetch }),
      ROOT,
    );

    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown[][];
    const calledUrl = String(calls[0]?.[0]);
    expect(calledUrl.startsWith(SITE_URL)).toBe(true);
    expect(calledUrl).not.toContain(STALE);
  });
});
