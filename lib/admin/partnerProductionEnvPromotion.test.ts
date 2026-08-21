// FILE: lib/admin/partnerProductionEnvPromotion.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";
import {
  RETURN_URL_ALLOWLIST_FIXTURE_MATRIX,
  isPartnerReturnUrlAllowlisted,
  normalizePartnerReturnUrlForAllowlist,
  partnerReturnUrlMatchesAllowlistEntry,
} from "@/lib/connect/returnUrlAllowlistSemantics";
import {
  guardProductionAdminMutationOrigin,
  parseActivatePromotionBody,
  parseReversePromotionBody,
} from "@/lib/admin/partnerProductionEnvPromotion";

const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import { POST as activatePOST } from "@/app/api/admin/partners/production-environment/activate/route";
import { POST as reversePOST } from "@/app/api/admin/partners/production-environment/reverse/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";
const RETURN_URL = "https://abraxasworld.xyz/good-trouble/enter";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/066_partner_production_env_promotion_atomic.sql",
);

function sqlMirrorNormalizeForAllowlist(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let scheme: "https" | "http" | null = null;
  let rest = "";
  if (/^https:\/\//i.test(trimmed)) {
    scheme = "https";
    rest = trimmed.slice(8);
  } else if (/^http:\/\//i.test(trimmed)) {
    scheme = "http";
    rest = trimmed.slice(7);
  } else {
    return null;
  }

  if (!rest) return null;

  const beforePath = rest.split(/[?#]/)[0] ?? "";
  const hostport = beforePath.split("/")[0] ?? "";
  if (!hostport) return null;

  if (scheme === "http" && hostport.split(":")[0]?.toLowerCase() !== "localhost") {
    return null;
  }

  let path = "/";
  const slashIndex = rest.indexOf("/");
  if (slashIndex >= 0) {
    path = rest.slice(slashIndex).replace(/[?#].*$/, "") || "/";
  }

  let normalized = `${scheme}://${hostport}${path}`;
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function sqlMirrorMatchesAllowlist(allowedUrls: string[], returnUrl: string): boolean {
  const normalized = sqlMirrorNormalizeForAllowlist(returnUrl);
  if (!normalized || !allowedUrls.length) return false;

  return allowedUrls.some((entry) => {
    const candidate = sqlMirrorNormalizeForAllowlist(entry);
    if (!candidate) return false;
    return normalized === candidate || normalized.startsWith(`${candidate}/`);
  });
}

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
}

function productionPostRequest(
  path: string,
  body: Record<string, unknown>,
  headers: HeadersInit = {},
): NextRequest {
  return new NextRequest(`https://${new URL(SITE_URL).host}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: SITE_URL,
      cookie: "abraxas_browser_session=test-token",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function allowlistedSession(): void {
  resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });

  const identityChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { email: "ops@example.com" }, error: null }),
  };

  createClientMock.mockReturnValue({
    from: vi.fn().mockReturnValue(identityChain),
    rpc: rpcMock,
  });
}

describe("partnerProductionEnvPromotion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productionEnv();
    allowlistedSession();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("return URL allowlist parity", () => {
    it("matches canonical TS semantics and SQL mirror on shared fixtures", () => {
      for (const fixture of RETURN_URL_ALLOWLIST_FIXTURE_MATRIX) {
        const tsResult = isPartnerReturnUrlAllowlisted(fixture.allowedUrls, fixture.returnUrl);
        const sqlResult = sqlMirrorMatchesAllowlist(fixture.allowedUrls, fixture.returnUrl);
        expect(tsResult, fixture.id).toBe(fixture.expected);
        expect(sqlResult, fixture.id).toBe(fixture.expected);
        expect(sqlResult, `${fixture.id} ts/sql parity`).toBe(tsResult);
      }
    });

    it("preserves entry prefix matching semantics used by callbacks", () => {
      const normalized = normalizePartnerReturnUrlForAllowlist("https://app.example.com/callback/step");
      expect(normalized).not.toBeNull();
      expect(partnerReturnUrlMatchesAllowlistEntry(normalized!, "https://app.example.com/callback")).toBe(true);
    });
  });

  describe("migration privilege lockdown static checks", () => {
    const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

    it("uses SECURITY DEFINER and safe search_path", () => {
      expect(migrationSql).toContain("SECURITY DEFINER");
      expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    });

    it("revokes execute from anon and authenticated and grants service_role", () => {
      expect(migrationSql).toContain("REVOKE EXECUTE ON FUNCTION public.partner_production_env_promote_atomic");
      expect(migrationSql).toContain("FROM anon");
      expect(migrationSql).toContain("FROM authenticated");
      expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.partner_production_env_promote_atomic");
      expect(migrationSql).toContain("TO postgres, service_role");
    });

    it("locks partner, policy, and live key rows", () => {
      expect(migrationSql).toContain("FROM public.partners");
      expect(migrationSql).toContain("FOR UPDATE");
      expect(migrationSql).toContain("FROM public.partner_policies");
      expect(migrationSql).toContain("FROM public.partner_api_keys");
    });

    it("does not introduce pg_catalog.digest or pgcrypto dependency for audit hashing", () => {
      expect(migrationSql).not.toContain("pg_catalog.digest");
      expect(migrationSql).not.toContain("pgcrypto");
      expect(migrationSql).toContain("event_hash");
      expect(migrationSql).toContain("NULL");
    });
  });

  describe("CSRF origin guard", () => {
    it("rejects missing Origin before RPC", async () => {
      const req = new NextRequest(`https://${new URL(SITE_URL).host}/api/admin/partners/production-environment/activate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "abraxas_browser_session=test-token",
        },
        body: JSON.stringify({
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        }),
      });

      const res = await activatePOST(req);
      expect(res.status).toBe(403);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("rejects cross-origin requests", async () => {
      const req = productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
        { origin: "https://evil.example" },
      );

      const res = await activatePOST(req);
      expect(res.status).toBe(403);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("accepts canonical Production Origin", () => {
      const req = new NextRequest(SITE_URL, { headers: { origin: SITE_URL } });
      expect(guardProductionAdminMutationOrigin(req)).toBeNull();
    });
  });

  describe("auth", () => {
    it("rejects PIN-only requests with 401 and no RPC", async () => {
      resolveBrowserSessionMock.mockResolvedValue(null);
      const req = productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
        { cookie: "", "x-admin-pin": "test-admin-pin" },
      );

      const res = await activatePOST(req);
      expect(res.status).toBe(401);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("returns 404 on demo deployment before RPC", async () => {
      demoEnv();
      const req = productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      );

      const res = await activatePOST(req);
      expect(res.status).toBe(404);
      expect(rpcMock).not.toHaveBeenCalled();
    });
  });

  describe("activate route RPC mapping", () => {
    it("returns 409 with boolean checks when RPC reports readiness_failed", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: false,
          code: "readiness_failed",
          checks: {
            query_valid: true,
            return_url_syntax_valid: true,
            partner_row_exists: true,
            partner_is_external: true,
            partner_status_usable: true,
            return_urls_configured: true,
            return_url_request_allowlisted: false,
            all_stored_return_urls_compliant: true,
            policy_row_exists: true,
            policy_active: true,
            policy_partner_match: true,
            policy_assigned_match: true,
            policy_not_sandbox: true,
            onboarding_fields_present: true,
          },
        },
        error: null,
      });

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));
      const body = await res.json() as { code?: string; checks?: Record<string, boolean> };

      expect(res.status).toBe(409);
      expect(body.code).toBe("readiness_failed");
      expect(body.checks?.return_url_request_allowlisted).toBe(false);
    });

    it("returns 409 when unsafe extra stored URL fails RPC write-time checks", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: false,
          code: "readiness_failed",
          checks: {
            query_valid: true,
            return_url_syntax_valid: true,
            partner_row_exists: true,
            partner_is_external: true,
            partner_status_usable: true,
            return_urls_configured: true,
            return_url_request_allowlisted: true,
            all_stored_return_urls_compliant: false,
            policy_row_exists: true,
            policy_active: true,
            policy_partner_match: true,
            policy_assigned_match: true,
            policy_not_sandbox: true,
            onboarding_fields_present: true,
          },
        },
        error: null,
      });

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));
      const body = await res.json() as { checks?: Record<string, boolean> };
      expect(res.status).toBe(409);
      expect(body.checks?.all_stored_return_urls_compliant).toBe(false);
    });

    it("returns 409 when policy deactivates between preflight and RPC lock", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: false,
          code: "readiness_failed",
          checks: {
            query_valid: true,
            return_url_syntax_valid: true,
            partner_row_exists: true,
            partner_is_external: true,
            partner_status_usable: true,
            return_urls_configured: true,
            return_url_request_allowlisted: true,
            all_stored_return_urls_compliant: true,
            policy_row_exists: true,
            policy_active: false,
            policy_partner_match: true,
            policy_assigned_match: true,
            policy_not_sandbox: true,
            onboarding_fields_present: true,
          },
        },
        error: null,
      });

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));
      const body = await res.json() as { checks?: Record<string, boolean> };
      expect(res.status).toBe(409);
      expect(body.checks?.policy_active).toBe(false);
    });

    it("returns 200 on RPC success without key material", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: true,
          partner_id: PARTNER_ID,
          allowed_environments: ["sandbox", "production"],
          status: "pilot",
          already_production_enabled: false,
          audit_event_id: "audit-1",
        },
        error: null,
      });

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));
      const body = await res.json() as Record<string, unknown>;
      const serialized = JSON.stringify(body);

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(serialized).not.toMatch(/key_prefix|key_hash|abx_live_/);
    });

    it("returns 500 when RPC fails so no partial promotion is reported", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: "audit insert failed" } });

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));

      expect(res.status).toBe(500);
    });

    it("supports idempotent activate retry", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: true,
          partner_id: PARTNER_ID,
          allowed_environments: ["sandbox", "production"],
          status: "pilot",
          already_production_enabled: true,
          audit_event_id: "audit-2",
        },
        error: null,
      });

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));
      const body = await res.json() as { already_production_enabled?: boolean };
      expect(res.status).toBe(200);
      expect(body.already_production_enabled).toBe(true);
    });
  });

  describe("reverse route RPC mapping", () => {
    it("returns 200 for reverse with active live keys without exposing key details", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: true,
          partner_id: PARTNER_ID,
          allowed_environments: ["sandbox"],
          status: "pilot",
          already_reversed: false,
          audit_event_id: "audit-rev-1",
        },
        error: null,
      });

      const res = await reversePOST(productionPostRequest(
        "/api/admin/partners/production-environment/reverse",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
        },
      ));
      const body = await res.json() as Record<string, unknown>;
      const serialized = JSON.stringify(body);

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(serialized).not.toMatch(/key_prefix|key_hash|revoked_count|abx_live_/);
    });

    it("returns 200 for reverse when no active live keys", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: true,
          partner_id: PARTNER_ID,
          allowed_environments: ["sandbox"],
          status: "pilot",
          already_reversed: false,
          audit_event_id: "audit-rev-2",
        },
        error: null,
      });

      const res = await reversePOST(productionPostRequest(
        "/api/admin/partners/production-environment/reverse",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
        },
      ));
      expect(res.status).toBe(200);
    });

    it("returns 500 when reverse RPC fails (audit/key rollback implied by transaction)", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: "partner_api_keys update failed" } });

      const res = await reversePOST(productionPostRequest(
        "/api/admin/partners/production-environment/reverse",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
        },
      ));
      expect(res.status).toBe(500);
    });

    it("supports idempotent reverse retry", async () => {
      rpcMock.mockResolvedValue({
        data: {
          ok: true,
          partner_id: PARTNER_ID,
          allowed_environments: ["sandbox"],
          status: "pilot",
          already_reversed: true,
          audit_event_id: "audit-rev-3",
        },
        error: null,
      });

      const res = await reversePOST(productionPostRequest(
        "/api/admin/partners/production-environment/reverse",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: PARTNER_ID,
        },
      ));
      const body = await res.json() as { already_reversed?: boolean };
      expect(res.status).toBe(200);
      expect(body.already_reversed).toBe(true);
    });
  });

  describe("request parsing", () => {
    it("rejects confirmation mismatch before RPC", async () => {
      const parsed = parseActivatePromotionBody({
        partner_id: PARTNER_ID,
        confirm_partner_id: "other-partner",
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
      });
      expect(parsed.ok).toBe(false);

      const res = await activatePOST(productionPostRequest(
        "/api/admin/partners/production-environment/activate",
        {
          partner_id: PARTNER_ID,
          confirm_partner_id: "other-partner",
          policy_id: POLICY_ID,
          return_url: RETURN_URL,
        },
      ));
      expect(res.status).toBe(400);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("parses reverse confirmation exactly", () => {
      const parsed = parseReversePromotionBody({
        partner_id: PARTNER_ID,
        confirm_partner_id: PARTNER_ID,
      });
      expect(parsed.ok).toBe(true);
    });
  });
});
