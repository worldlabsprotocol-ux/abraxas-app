// FILE: lib/admin/designPartnerPilotSummaryRoute.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FORBIDDEN_PILOT_SUMMARY_QUERY_TABLES } from "@/lib/admin/designPartnerPilotSummary";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const checkProductionSensitiveAdminAccessMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

import { GET } from "@/app/api/admin/design-partners/pilot-summary/route";

type QueryCall = {
  table: string;
  action: "select";
  filters: Array<{ type: string; column?: string; value?: unknown }>;
  limit?: number;
};

function createSupabaseMock(handlers: {
  designPartners?: { data: unknown[] | null; error: unknown };
  partners?: { data: unknown[] | null; error: unknown };
  policies?: { data: unknown[] | null; error: unknown };
  webhookConfigs?: { data: unknown[] | null; error: unknown };
}) {
  const calls: QueryCall[] = [];

  fromMock.mockImplementation((table: string) => {
    const query: QueryCall = { table, action: "select", filters: [] };
    const chain = {
      select: vi.fn(() => chain),
      not: vi.fn((column: string, _op: string, value: unknown) => {
        query.filters.push({ type: "not", column, value });
        return chain;
      }),
      neq: vi.fn((column: string, value: unknown) => {
        query.filters.push({ type: "neq", column, value });
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn((value: number) => {
        query.limit = value;
        return chain;
      }),
      in: vi.fn((column: string, value: unknown) => {
        query.filters.push({ type: "in", column, value });
        return chain;
      }),
      then: undefined,
    };

    Object.defineProperty(chain, "then", {
      get() {
        calls.push(query);
        const result =
          table === "design_partners"
            ? handlers.designPartners ?? { data: [], error: null }
            : table === "partners"
              ? handlers.partners ?? { data: [], error: null }
              : table === "partner_policies"
                ? handlers.policies ?? { data: [], error: null }
                : table === "partner_webhook_configs"
                  ? handlers.webhookConfigs ?? { data: [], error: null }
                  : { data: null, error: { message: "unexpected_table" } };
        return (resolve: (value: unknown) => void) => resolve(result);
      },
    });

    return chain;
  });

  return { calls };
}

describe("pilot-summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when production-sensitive access is denied", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/admin/design-partners/pilot-summary"));
    expect(res.status).toBe(401);
  });

  it("returns bounded summaries without querying forbidden activity tables", async () => {
    const { calls } = createSupabaseMock({
      designPartners: {
        data: [
          {
            id: "app-1",
            company: "Acme Corp",
            promoted_partner_id: "acme-v1",
            status: "onboarded",
          },
        ],
        error: null,
      },
      partners: {
        data: [
          {
            partner_id: "acme-v1",
            is_external: true,
            allowed_environments: ["sandbox"],
            allowed_return_urls: ["https://partner.example.com/callback"],
            assigned_policy_id: "policy-sandbox",
            onboarding_checklist: null,
          },
        ],
        error: null,
      },
      policies: {
        data: [
          {
            id: "policy-sandbox",
            version: 1,
            status: "active",
            name: "Sandbox",
            partner_id: "acme-v1",
          },
        ],
        error: null,
      },
      webhookConfigs: {
        data: [{ partner_id: "acme-v1" }],
        error: null,
      },
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/design-partners/pilot-summary"));
    const body = await res.json() as {
      summaries: Array<Record<string, unknown>>;
      meta: { capped: boolean; returned: number };
    };

    expect(res.status).toBe(200);
    expect(body.summaries).toHaveLength(1);
    expect(body.meta.capped).toBe(false);
    expect(body.summaries[0]).not.toHaveProperty("email");
    expect(body.summaries[0]).not.toHaveProperty("onboarding_checklist");

    const queriedTables = calls.map((call) => call.table);
    expect(queriedTables).toEqual([
      "design_partners",
      "partners",
      "partner_policies",
      "partner_webhook_configs",
    ]);
    for (const forbidden of FORBIDDEN_PILOT_SUMMARY_QUERY_TABLES) {
      expect(queriedTables).not.toContain(forbidden);
    }
    expect(calls.filter((call) => call.table === "design_partners")[0]?.limit).toBe(51);
  });

  it("marks webhook_configured unavailable when config query fails", async () => {
    createSupabaseMock({
      designPartners: {
        data: [
          {
            id: "app-1",
            company: "Acme Corp",
            promoted_partner_id: "acme-v1",
            status: "onboarded",
          },
        ],
        error: null,
      },
      partners: {
        data: [
          {
            partner_id: "acme-v1",
            is_external: true,
            allowed_environments: ["sandbox"],
            allowed_return_urls: ["https://partner.example.com/callback"],
            assigned_policy_id: "policy-sandbox",
            onboarding_checklist: null,
          },
        ],
        error: null,
      },
      policies: {
        data: [
          {
            id: "policy-sandbox",
            version: 1,
            status: "active",
            name: "Sandbox",
            partner_id: "acme-v1",
          },
        ],
        error: null,
      },
      webhookConfigs: {
        data: null,
        error: { message: "relation missing" },
      },
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/design-partners/pilot-summary"));
    const body = await res.json() as {
      summaries: Array<{ technical: { webhook_configured: { availability: string } } }>;
    };
    expect(res.status).toBe(200);
    expect(body.summaries[0].technical.webhook_configured).toEqual({
      availability: "unavailable",
    });
  });

  it("returns 500 on core partner load failure without database error text", async () => {
    createSupabaseMock({
      designPartners: {
        data: [
          {
            id: "app-1",
            company: "Acme Corp",
            promoted_partner_id: "acme-v1",
            status: "onboarded",
          },
        ],
        error: null,
      },
      partners: {
        data: null,
        error: { message: "sensitive sql detail" },
      },
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/design-partners/pilot-summary"));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unable to load pilot summaries");
    expect(body.error).not.toMatch(/sql|relation/i);
  });

  it("caps at 50 when 51 promoted rows are returned", async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `app-${index}`,
      company: `Company ${index}`,
      promoted_partner_id: `partner-${index}`,
      status: "onboarded",
    }));

    createSupabaseMock({
      designPartners: { data: rows, error: null },
      partners: {
        data: rows.map((row) => ({
          partner_id: row.promoted_partner_id,
          is_external: true,
          allowed_environments: ["sandbox"],
          allowed_return_urls: ["https://partner.example.com/callback"],
          assigned_policy_id: "policy-sandbox",
          onboarding_checklist: null,
        })),
        error: null,
      },
      policies: {
        data: rows.map((row) => ({
          id: "policy-sandbox",
          version: 1,
          status: "active",
          name: "Sandbox",
          partner_id: row.promoted_partner_id,
        })),
        error: null,
      },
      webhookConfigs: { data: [], error: null },
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/design-partners/pilot-summary"));
    const body = await res.json() as { summaries: unknown[]; meta: { capped: boolean; returned: number } };
    expect(res.status).toBe(200);
    expect(body.meta.capped).toBe(true);
    expect(body.meta.returned).toBe(50);
    expect(body.summaries).toHaveLength(50);
  });
});
