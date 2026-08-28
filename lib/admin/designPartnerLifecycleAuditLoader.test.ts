// FILE: lib/admin/designPartnerLifecycleAuditLoader.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertDesignPartnerApplicationExists,
  classifyLifecycleAuditLoaderError,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME,
  FORBIDDEN_LIFECYCLE_AUDIT_QUERY_TABLES,
  loadDesignPartnerLifecycleAuditWithClient,
} from "@/lib/admin/designPartnerLifecycleAuditLoader";
import { encodeDesignPartnerLifecycleAuditCursor } from "@/lib/admin/designPartnerLifecycleAuditCursor";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000001";
const ROW_ID = "10000000-0000-4000-8000-000000000003";

function createSupabaseMock(handlers: {
  exists?: { data: { id: string } | null; error: unknown };
  rpc?: { data: unknown; error: unknown };
}) {
  const calls: Array<{ kind: "from" | "rpc"; table?: string; rpc?: string; args?: unknown }> = [];
  const fromMock = vi.fn((table: string) => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => {
      calls.push({ kind: "from", table });
      return handlers.exists ?? { data: { id: APPLICATION_ID }, error: null };
    }),
  };
  return chain;
  });
  const rpcMock = vi.fn(async (_name: string, args: unknown) => {
    calls.push({ kind: "rpc", rpc: DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME, args });
    return handlers.rpc ?? {
      data: {
        events: [
          {
            event_type: "admin.design_partner.approved",
            application_id: APPLICATION_ID,
            from_status: "submitted",
            to_status: "approved",
            promoted_partner_id: null,
            occurred_at: "2026-01-01T00:00:00.000Z",
            operator_category: "admin_pin",
          },
        ],
        next_cursor: {
          occurred_at: "2026-01-01T00:00:00.000Z",
          id: ROW_ID,
        },
      },
      error: null,
    };
  });

  return {
    client: { from: fromMock, rpc: rpcMock } as never,
    calls,
    fromMock,
    rpcMock,
  };
}

describe("assertDesignPartnerApplicationExists", () => {
  it("selects id only from design_partners", async () => {
    const { client, fromMock } = createSupabaseMock({});
    const exists = await assertDesignPartnerApplicationExists(client, APPLICATION_ID);
    expect(exists).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("design_partners");
    const chain = fromMock.mock.results[0]?.value as { select: ReturnType<typeof vi.fn> };
    expect(chain.select).toHaveBeenCalledWith("id");
  });
});

describe("loadDesignPartnerLifecycleAuditWithClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls v2 RPC with correct arguments and converts opaque next cursor", async () => {
    const cursor = {
      version: 1 as const,
      applicationId: APPLICATION_ID,
      occurredAt: "2025-12-31T23:59:59.999Z",
      id: "20000000-0000-4000-8000-000000000004",
    };
    const { client, rpcMock } = createSupabaseMock({});
    const response = await loadDesignPartnerLifecycleAuditWithClient(client, {
      applicationId: APPLICATION_ID,
      limit: 10,
      cursor,
    });

    expect(rpcMock).toHaveBeenCalledWith(DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME, {
      p_application_id: APPLICATION_ID,
      p_limit: 10,
      p_cursor_occurred_at: cursor.occurredAt,
      p_cursor_id: cursor.id,
    });
    expect(response.application_id).toBe(APPLICATION_ID);
    expect(response.events[0]?.operator_label).toBe("PIN session");
    expect(response.events[0]).not.toHaveProperty("operator_category");
    expect(response.next_cursor).toBe(
      encodeDesignPartnerLifecycleAuditCursor(APPLICATION_ID, "2026-01-01T00:00:00.000Z", ROW_ID),
    );
  });

  it("never queries audit_events directly", async () => {
    const { client, fromMock } = createSupabaseMock({});
    await loadDesignPartnerLifecycleAuditWithClient(client, {
      applicationId: APPLICATION_ID,
      limit: 25,
      cursor: null,
    });
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("design_partners");
    for (const forbidden of FORBIDDEN_LIFECYCLE_AUDIT_QUERY_TABLES) {
      expect(fromMock).not.toHaveBeenCalledWith(forbidden);
    }
  });

  it("throws application_not_found when existence check fails", async () => {
    const { client } = createSupabaseMock({
      exists: { data: null, error: null },
    });
    await expect(loadDesignPartnerLifecycleAuditWithClient(client, {
      applicationId: APPLICATION_ID,
      limit: 25,
      cursor: null,
    })).rejects.toThrow("application_not_found");
  });

  it("throws rpc_failed on RPC errors without leaking database text", async () => {
    const { client } = createSupabaseMock({
      rpc: { data: null, error: { message: "relation audit_events does not exist" } },
    });
    await expect(loadDesignPartnerLifecycleAuditWithClient(client, {
      applicationId: APPLICATION_ID,
      limit: 25,
      cursor: null,
    })).rejects.toThrow("rpc_failed");
  });

  it("throws invalid_rpc_envelope on malformed RPC payloads", async () => {
    const { client } = createSupabaseMock({
      rpc: { data: { events: [], next_cursor: null, extra: true }, error: null },
    });
    await expect(loadDesignPartnerLifecycleAuditWithClient(client, {
      applicationId: APPLICATION_ID,
      limit: 25,
      cursor: null,
    })).rejects.toThrow("invalid_rpc_envelope");
  });
});

describe("classifyLifecycleAuditLoaderError", () => {
  it("maps loader failures to generic safe responses", () => {
    expect(classifyLifecycleAuditLoaderError(new Error("application_not_found"))).toEqual({
      status: 404,
      message: "Application not found",
    });
    expect(classifyLifecycleAuditLoaderError(new Error("supabase_not_configured"))).toEqual({
      status: 503,
      message: "Service temporarily unavailable",
    });
    expect(classifyLifecycleAuditLoaderError(new Error("rpc_failed"))).toEqual({
      status: 500,
      message: "Service temporarily unavailable",
    });
    expect(classifyLifecycleAuditLoaderError(new Error("relation audit_events does not exist"))).toEqual({
      status: 500,
      message: "Service temporarily unavailable",
    });
  });
});
