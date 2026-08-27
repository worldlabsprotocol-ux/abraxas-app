// FILE: lib/admin/designPartnerApplicationRoute.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const checkProductionSensitiveAdminAccessMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/partner/partnerAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerAuth")>();
  return {
    ...actual,
    generatePartnerKey: vi.fn(() => ({
      raw: "abx_test_abcdefg_restignored",
      prefix: "abx_test_abcdefg",
      hash: "a".repeat(64),
    })),
  };
});

import { GET as designPartnersGET, PATCH as designPartnersPATCH } from "@/app/api/admin/design-partners/route";
import { POST as promotePOST } from "@/app/api/admin/design-partners/promote/route";
import { DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS } from "@/lib/admin/designPartnerApplicationDetailContract";
import { DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS } from "@/lib/admin/designPartnerApplicationDetail";

const APP_ID = "00000000-0000-4000-8000-000000000001";
const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/070_design_partner_promote_atomic.sql",
);

function createChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    update: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  for (const fn of Object.values(chain)) {
    fn.mockReturnValue(chain);
  }
  return chain;
}

function designPartnerPatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/design-partners", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function promoteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/design-partners/promote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("070_design_partner_promote_atomic migration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

  it("uses SECURITY DEFINER, safe search_path, and FOR UPDATE", () => {
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    expect(migrationSql).toContain("FOR UPDATE");
    expect(migrationSql).toContain("FROM public.design_partners");
  });

  it("inserts partners without upsert and keeps sandbox-only environments", () => {
    expect(migrationSql).toContain("INSERT INTO public.partners");
    expect(migrationSql).not.toMatch(/ON CONFLICT/i);
    expect(migrationSql).not.toContain("UPSERT");
    expect(migrationSql).toContain("ARRAY['sandbox']::text[]");
    expect(migrationSql).toContain("abx_test_");
    expect(migrationSql).not.toContain("abx_live_");
    expect(migrationSql).not.toContain("p_issue_live");
    expect(migrationSql).toContain("ARRAY['verify:credential', 'verify:registry']");
  });

  it("claims promoted_partner_id before partner and key inserts", () => {
    const claimIndex = migrationSql.indexOf("SET promoted_partner_id");
    const partnerInsertIndex = migrationSql.indexOf("INSERT INTO public.partners");
    const keyInsertIndex = migrationSql.indexOf("INSERT INTO public.partner_api_keys");
    expect(claimIndex).toBeGreaterThan(-1);
    expect(partnerInsertIndex).toBeGreaterThan(claimIndex);
    expect(keyInsertIndex).toBeGreaterThan(partnerInsertIndex);
  });

  it("maps unique violations to fixed raised signals that roll back the claim", () => {
    expect(migrationSql).toContain("RAISE EXCEPTION 'partner_id_conflict'");
    expect(migrationSql).toContain("RAISE EXCEPTION 'key_insert_failed'");

    const claimIndex = migrationSql.indexOf("SET promoted_partner_id");
    const promotionBlockBegin = migrationSql.lastIndexOf("BEGIN", claimIndex);
    expect(promotionBlockBegin).toBeGreaterThan(-1);
    expect(promotionBlockBegin).toBeLessThan(claimIndex);

    const functionEnd = migrationSql.indexOf("REVOKE ALL ON FUNCTION");
    const postClaimSql = migrationSql.slice(claimIndex, functionEnd);
    expect(postClaimSql).not.toMatch(/RETURN\s+jsonb_build_object\([^)]*'code'\s*,\s*'partner_id_conflict'/);
    expect(postClaimSql).not.toMatch(/RETURN\s+jsonb_build_object\([^)]*'code'\s*,\s*'key_insert_failed'/);
  });

  it("locks down execute privileges", () => {
    expect(migrationSql).toContain("REVOKE ALL ON FUNCTION public.design_partner_promote_atomic");
    expect(migrationSql).toContain("FROM anon");
    expect(migrationSql).toContain("FROM authenticated");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.design_partner_promote_atomic");
    expect(migrationSql).toContain("TO postgres, service_role");
  });

  it("does not write audit_events or accept raw keys", () => {
    expect(migrationSql).not.toContain("audit_events");
    expect(migrationSql).not.toContain("p_raw");
    expect(migrationSql).toContain("invalid_input");
  });
});

describe("design-partners GET list", () => {
  let designPartnersChain: ReturnType<typeof createChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    designPartnersChain = createChain();
    createClientMock.mockReturnValue({ from: vi.fn(() => designPartnersChain) });
  });

  it("projects allowlisted application DTO fields", async () => {
    designPartnersChain.limit.mockResolvedValueOnce({
      data: [{
        id: APP_ID,
        promoted_partner_id: null,
        reviewer_notes: null,
        company: "Acme",
        contact_name: "Ops",
        email: "ops@example.com",
        website: "https://example.com",
        integration_type: "passport_gate",
        use_case: "Pilot",
        monthly_volume: "low",
        public_name_ok: true,
        status: "submitted",
        created_at: "2026-01-01T00:00:00.000Z",
        reviewed_at: null,
        proof_id: "must-not-leak",
      }],
      error: null,
    });

    const res = await designPartnersGET(new NextRequest("http://localhost/api/admin/design-partners"));
    expect(res.status).toBe(200);
    expect(designPartnersChain.select).toHaveBeenCalledWith(DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS);
    const body = await res.json() as { applications: Array<Record<string, unknown>> };
    expect(body.applications).toHaveLength(1);
    expect(Object.keys(body.applications[0]!).sort()).toEqual([...DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS].sort());
    expect(JSON.stringify(body)).not.toContain("proof_id");
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
  });

  it("returns 401 when admin access is denied", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValueOnce(false);
    const res = await designPartnersGET(new NextRequest("http://localhost/api/admin/design-partners"));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
    expect(JSON.stringify(body)).not.toContain("@");
  });
});

describe("design-partners PATCH lifecycle", () => {
  let designPartnersChain: ReturnType<typeof createChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    designPartnersChain = createChain();
    createClientMock.mockReturnValue({ from: vi.fn(() => designPartnersChain) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects submitted application with conditional transition", async () => {
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "rejected",
        promoted_partner_id: null,
        reviewer_notes: null,
      },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "rejected" }));
    expect(res.status).toBe(200);
    const updatePayload = designPartnersChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updatePayload.status).toBe("rejected");
    expect(designPartnersChain.eq).toHaveBeenCalledWith("status", "submitted");
    expect(designPartnersChain.is).toHaveBeenCalledWith("promoted_partner_id", null);
  });

  it("returns no-op for already rejected without notes", async () => {
    designPartnersChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: APP_ID,
          status: "rejected",
          promoted_partner_id: null,
          reviewer_notes: "keep",
        },
        error: null,
      });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "rejected" }));
    expect(res.status).toBe(200);
    expect(designPartnersChain.update).toHaveBeenCalledTimes(2);
  });

  it("updates notes only for onboarded promoted applications", async () => {
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: "acme-v1",
        reviewer_notes: null,
      },
      error: null,
    });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: "acme-v1",
        reviewer_notes: "ops",
      },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "onboarded",
      reviewer_notes: "ops",
    }));

    expect(res.status).toBe(200);
    const notesPayload = designPartnersChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(notesPayload).toEqual({ reviewer_notes: "ops" });
    expect(notesPayload).not.toHaveProperty("reviewed_at");
    expect(notesPayload).not.toHaveProperty("status");
  });

  it("fails closed when reject races a promoted application", async () => {
    designPartnersChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: APP_ID,
          status: "onboarded",
          promoted_partner_id: "acme-v1",
          reviewer_notes: null,
        },
        error: null,
      });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "rejected" }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("application_already_promoted");
    expect(JSON.stringify(body)).not.toContain("@");
    expect(designPartnersChain.update).toHaveBeenCalledTimes(2);
  });

  it("does not commit reviewer_notes when reject with notes loses to promotion", async () => {
    designPartnersChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: APP_ID,
          status: "onboarded",
          promoted_partner_id: "acme-v1",
          reviewer_notes: null,
        },
        error: null,
      });

    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "rejected",
      reviewer_notes: "race loser",
    }));

    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("application_already_promoted");
    expect(designPartnersChain.update).toHaveBeenCalledTimes(2);
    for (const call of designPartnersChain.update.mock.calls) {
      const payload = call[0] as Record<string, unknown>;
      expect(payload).toHaveProperty("status", "rejected");
      expect(payload).toHaveProperty("reviewed_at");
      expect(payload.reviewer_notes).toBe("race loser");
    }
  });

  it("clears reviewer_notes on approved idempotent patch when empty string provided", async () => {
    designPartnersChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: APP_ID,
          status: "approved",
          promoted_partner_id: null,
          reviewer_notes: "keep me",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: APP_ID,
          status: "approved",
          promoted_partner_id: null,
          reviewer_notes: null,
        },
        error: null,
      });

    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "approved",
      reviewer_notes: "",
    }));

    expect(res.status).toBe(200);
    expect(designPartnersChain.update).toHaveBeenCalledTimes(2);
    const transitionPayload = designPartnersChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(transitionPayload.status).toBe("approved");
    expect(transitionPayload.reviewer_notes).toBeNull();
    const notesPayload = designPartnersChain.update.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(notesPayload.reviewer_notes).toBeNull();
    expect(notesPayload).not.toHaveProperty("reviewed_at");
    expect(notesPayload).not.toHaveProperty("status");
  });
});

describe("design-partners promote route", () => {
  let designPartnersChain: ReturnType<typeof createChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    designPartnersChain = createChain();
    rpcMock.mockReset();
    createClientMock.mockReturnValue({
      from: vi.fn(() => designPartnersChain),
      rpc: rpcMock,
    });
  });

  it("calls promote RPC exactly once and returns sandbox key prefix only in HTTP body", async () => {
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        company: "Acme",
        contact_name: "Ops",
        email: "hidden@example.com",
        use_case: "test",
        integration_type: "passport_gate",
        public_name_ok: false,
        status: "approved",
        promoted_partner_id: null,
      },
      error: null,
    });
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "ok",
        application_id: APP_ID,
        partner_id: "acme-v1",
        key_prefix: "abx_test_abcdefg",
      },
      error: null,
    });

    const res = await promotePOST(promoteRequest({
      application_id: APP_ID,
      partner_id: "acme-v1",
    }));

    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0]?.[0]).toBe("design_partner_promote_atomic");
    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({
      p_application_id: APP_ID,
      p_partner_id: "acme-v1",
      p_key_prefix: "abx_test_abcdefg",
      p_key_hash: "a".repeat(64),
    });
    const body = await res.json() as { api_key: string; error?: string };
    expect(body.api_key).toBe("abx_test_abcdefg_restignored");
    expect(JSON.stringify(body)).not.toContain("@");
  });

  it("maps rejected applications to application_rejected without extra rpc retries", async () => {
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        company: "Acme",
        contact_name: null,
        email: "hidden@example.com",
        use_case: null,
        integration_type: null,
        public_name_ok: false,
        status: "rejected",
        promoted_partner_id: null,
      },
      error: null,
    });
    rpcMock.mockResolvedValueOnce({
      data: { ok: false, code: "application_rejected" },
      error: null,
    });

    const res = await promotePOST(promoteRequest({ application_id: APP_ID, partner_id: "acme-v1" }));
    expect(res.status).toBe(409);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("application_rejected");
  });

  it("maps rpc partner_id_conflict without leaking sql details", async () => {
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        company: "Acme",
        contact_name: null,
        email: "hidden@example.com",
        use_case: null,
        integration_type: null,
        public_name_ok: false,
        status: "approved",
        promoted_partner_id: null,
      },
      error: null,
    });
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "partner_id_conflict" },
    });

    const res = await promotePOST(promoteRequest({ application_id: APP_ID, partner_id: "acme-v1" }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("partner_id_conflict");
    expect(body.error).not.toContain("unique");
  });
});
