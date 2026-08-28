// FILE: lib/admin/designPartnerApplicationRoute.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const checkProductionSensitiveAdminAccessMock = vi.hoisted(() => vi.fn());
const resolveDesignPartnerAdminActorCategoryMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/admin/designPartnerAdminActor", () => ({
  resolveDesignPartnerAdminActorCategory: (...args: unknown[]) =>
    resolveDesignPartnerAdminActorCategoryMock(...args),
  recordContainsForbiddenClientMutationFields: (record: Record<string, unknown>) =>
    Object.keys(record).some((key) => [
      "actor_category",
      "audit_event_id",
      "key_hash",
      "key_prefix",
      "api_key",
    ].includes(key)),
  hasOnlyAllowlistedKeys: (record: Record<string, unknown>, allowlist: readonly string[]) => {
    const keys = Object.keys(record);
    return keys.length > 0 && keys.every((key) => allowlist.includes(key));
  },
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
import { DESIGN_PARTNER_REVIEW_TRANSITION_RPC } from "@/lib/admin/designPartnerReviewTransitionLoader";
import { DESIGN_PARTNER_PROMOTE_RPC_V2 } from "@/lib/partner/promoteDesignPartner";
import { DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS } from "@/lib/admin/designPartnerApplicationDetailContract";
import { DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS } from "@/lib/admin/designPartnerApplicationDetail";
import {
  buildDesignPartnerQueueKeysetOrFilter,
  encodeDesignPartnerQueueCursor,
} from "@/lib/admin/designPartnerApplicationQueueCursor";

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
    not: vi.fn(),
    or: vi.fn(),
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

function listRequest(query: string) {
  return new NextRequest(`http://localhost/api/admin/design-partners?${query}`);
}

const LIST_ROW = {
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
};

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

  it("projects allowlisted application DTO fields with pagination metadata", async () => {
    designPartnersChain.limit.mockResolvedValueOnce({
      data: [{ ...LIST_ROW, proof_id: "must-not-leak" }],
      error: null,
    });

    const res = await designPartnersGET(listRequest("status=submitted"));
    expect(res.status).toBe(200);
    expect(designPartnersChain.select).toHaveBeenCalledWith(DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS);
    expect(designPartnersChain.order).toHaveBeenNthCalledWith(1, "created_at", { ascending: false });
    expect(designPartnersChain.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(designPartnersChain.limit).toHaveBeenCalledWith(26);
    const body = await res.json() as {
      applications: Array<Record<string, unknown>>;
      next_cursor: string | null;
      has_more: boolean;
    };
    expect(body.applications).toHaveLength(1);
    expect(Object.keys(body.applications[0]!).sort()).toEqual([...DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS].sort());
    expect(body.next_cursor).toBeNull();
    expect(body.has_more).toBe(false);
    expect(JSON.stringify(body)).not.toContain("proof_id");
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
  });

  it("returns 401 when admin access is denied before query validation", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValueOnce(false);
    const res = await designPartnersGET(listRequest("status=submitted&limit=abc"));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
    expect(JSON.stringify(body)).not.toContain("@");
    expect(designPartnersChain.limit).not.toHaveBeenCalled();
  });

  it("defaults absent limit to 25 and rejects invalid supplied limits", async () => {
    designPartnersChain.limit.mockResolvedValue({ data: [], error: null });

    const defaultRes = await designPartnersGET(listRequest("status=submitted"));
    expect(defaultRes.status).toBe(200);
    expect(designPartnersChain.limit).toHaveBeenLastCalledWith(26);

    for (const invalid of ["0", "51", "abc", ""]) {
      const res = await designPartnersGET(listRequest(`status=submitted&limit=${invalid}`));
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string; code: string };
      expect(body).toEqual({ error: "Invalid request", code: "invalid_input" });
    }
  });

  it("accepts limit 1 and 50", async () => {
    designPartnersChain.limit.mockResolvedValue({ data: [], error: null });
    const one = await designPartnersGET(listRequest("status=submitted&limit=1"));
    expect(one.status).toBe(200);
    expect(designPartnersChain.limit).toHaveBeenLastCalledWith(2);

    const fifty = await designPartnersGET(listRequest("status=submitted&limit=50"));
    expect(fifty.status).toBe(200);
    expect(designPartnersChain.limit).toHaveBeenLastCalledWith(51);
  });

  it("rejects unknown and repeated query parameters", async () => {
    const unknown = await designPartnersGET(listRequest("status=submitted&company=Acme"));
    expect(unknown.status).toBe(400);

    const repeated = await designPartnersGET(listRequest("status=submitted&limit=25&limit=25"));
    expect(repeated.status).toBe(400);
  });

  it("returns stable next_cursor and has_more when a trailing page exists", async () => {
    const secondId = "00000000-0000-4000-8000-000000000002";
    designPartnersChain.limit.mockResolvedValueOnce({
      data: [
        LIST_ROW,
        { ...LIST_ROW, id: secondId, created_at: "2026-01-01T00:00:00.000Z" },
      ],
      error: null,
    });

    const res = await designPartnersGET(listRequest("status=submitted&limit=1"));
    const body = await res.json() as { next_cursor: string | null; has_more: boolean };
    expect(body.has_more).toBe(true);
    expect(body.next_cursor).toBe(
      encodeDesignPartnerQueueCursor("submitted", LIST_ROW.created_at, LIST_ROW.id),
    );
  });

  it("applies exact keyset filter for equal created_at tie-break pages", async () => {
    const cursor = encodeDesignPartnerQueueCursor(
      "submitted",
      "2026-01-01T00:00:00.000Z",
      APP_ID,
    );
    designPartnersChain.limit.mockResolvedValueOnce({ data: [], error: null });

    const res = await designPartnersGET(listRequest(`status=submitted&cursor=${cursor}`));
    expect(res.status).toBe(200);
    expect(designPartnersChain.or).toHaveBeenCalledWith(
      buildDesignPartnerQueueKeysetOrFilter("2026-01-01T00:00:00.000Z", APP_ID),
    );
  });

  it("rejects malformed cursor payloads and cursor status mismatch", async () => {
    const mismatch = encodeDesignPartnerQueueCursor("submitted", LIST_ROW.created_at, LIST_ROW.id);
    const mismatchRes = await designPartnersGET(listRequest(`status=approved&cursor=${mismatch}`));
    expect(mismatchRes.status).toBe(400);
    const mismatchBody = await mismatchRes.json() as { code: string };
    expect(mismatchBody.code).toBe("invalid_cursor");

    const malformedRes = await designPartnersGET(listRequest("status=submitted&cursor=%%%"));
    expect(malformedRes.status).toBe(400);
  });

  it("accepts structurally valid modified cursor values as unsigned position tokens", async () => {
    const modified = encodeDesignPartnerQueueCursor(
      "submitted",
      "2025-12-31T23:59:59.999Z",
      "00000000-0000-4000-8000-000000000099",
    );
    designPartnersChain.limit.mockResolvedValueOnce({ data: [], error: null });
    const res = await designPartnersGET(listRequest(`status=submitted&cursor=${modified}`));
    expect(res.status).toBe(200);
    expect(designPartnersChain.or).toHaveBeenCalledWith(
      buildDesignPartnerQueueKeysetOrFilter(
        "2025-12-31T23:59:59.999Z",
        "00000000-0000-4000-8000-000000000099",
      ),
    );
  });
});

describe("design-partners PATCH lifecycle", () => {
  let designPartnersChain: ReturnType<typeof createChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    resolveDesignPartnerAdminActorCategoryMock.mockResolvedValue("admin_pin");
    designPartnersChain = createChain();
    rpcMock.mockReset();
    createClientMock.mockReturnValue({
      from: vi.fn(() => designPartnersChain),
      rpc: rpcMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unknown parsed JSON object keys", async () => {
    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "approved",
      company: "Acme",
    }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(designPartnersChain.update).not.toHaveBeenCalled();
  });

  it("rejects client-supplied actor_category", async () => {
    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "approved",
      actor_category: "admin_pin",
    }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("approves via review transition RPC exactly once with server actor category", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "ok",
        application: {
          id: APP_ID,
          status: "approved",
          promoted_partner_id: null,
          reviewer_notes: null,
        },
        audit_event_id: "evt-hidden",
      },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "approved" }));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0]?.[0]).toBe(DESIGN_PARTNER_REVIEW_TRANSITION_RPC);
    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({
      p_application_id: APP_ID,
      p_target_status: "approved",
      p_actor_category: "admin_pin",
      p_reviewer_notes_present: false,
    });
    expect(designPartnersChain.update).not.toHaveBeenCalled();
    const body = await res.json() as { application: Record<string, unknown> };
    expect(body.application).toEqual({
      id: APP_ID,
      status: "approved",
      promoted_partner_id: null,
      reviewer_notes: null,
    });
    expect(JSON.stringify(body)).not.toContain("audit_event_id");
  });

  it("rejects via review transition RPC exactly once and performs no direct status UPDATE", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "ok",
        application: {
          id: APP_ID,
          status: "rejected",
          promoted_partner_id: null,
          reviewer_notes: "no",
        },
      },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "rejected",
      reviewer_notes: "no",
    }));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(designPartnersChain.update).not.toHaveBeenCalled();
  });

  it("returns no_op from RPC without direct UPDATE", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "no_op",
        application: {
          id: APP_ID,
          status: "rejected",
          promoted_partner_id: null,
          reviewer_notes: "keep",
        },
      },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "rejected" }));
    expect(res.status).toBe(200);
    expect(designPartnersChain.update).not.toHaveBeenCalled();
  });

  it("maps notes_only and empty-note clearing through RPC", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "notes_only",
        application: {
          id: APP_ID,
          status: "approved",
          promoted_partner_id: null,
          reviewer_notes: null,
        },
      },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "approved",
      reviewer_notes: "",
    }));
    expect(res.status).toBe(200);
    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({
      p_reviewer_notes_present: true,
      p_reviewer_notes: "",
    });
    const body = await res.json() as { application: { reviewer_notes: string | null } };
    expect(body.application.reviewer_notes).toBeNull();
  });

  it("maps promoted race to application_already_promoted", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: false, code: "application_already_promoted" },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "rejected" }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("application_already_promoted");
    expect(designPartnersChain.update).not.toHaveBeenCalled();
  });

  it("maps status_conflict for stale transitions", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: false, code: "status_conflict" },
      error: null,
    });

    const res = await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "approved" }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("status_conflict");
  });

  it("updates notes only for onboarded promoted applications via direct UPDATE", async () => {
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
    expect(rpcMock).not.toHaveBeenCalled();
    const notesPayload = designPartnersChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(notesPayload).toEqual({ reviewer_notes: "ops" });
    expect(notesPayload).not.toHaveProperty("status");
  });
});

describe("design-partners promote route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    resolveDesignPartnerAdminActorCategoryMock.mockResolvedValue("admin_authorized_email");
    rpcMock.mockReset();
    createClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it("calls promote v2 RPC exactly once with no pre-load query and never calls v1", async () => {
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
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0]?.[0]).toBe(DESIGN_PARTNER_PROMOTE_RPC_V2);
    expect(rpcMock.mock.calls[0]?.[0]).not.toBe("design_partner_promote_atomic");
    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({
      p_application_id: APP_ID,
      p_partner_id: "acme-v1",
      p_key_prefix: "abx_test_abcdefg",
      p_key_hash: "a".repeat(64),
      p_actor_category: "admin_authorized_email",
    });
    const body = await res.json() as { api_key: string; error?: string };
    expect(body.api_key).toBe("abx_test_abcdefg_restignored");
    expect(JSON.stringify(body)).not.toContain("@");
  });

  it("requires partner_id in request body", async () => {
    const res = await promotePOST(promoteRequest({ application_id: APP_ID }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects client spoof actor_category", async () => {
    const res = await promotePOST(promoteRequest({
      application_id: APP_ID,
      partner_id: "acme-v1",
      actor_category: "admin_pin",
    }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("maps rejected applications to application_rejected without extra rpc retries", async () => {
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
