// FILE: lib/goodTrouble/tableProbe.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  classifyTableProbeError,
  probeSupabaseTable,
  tableProbeToReadinessStatus,
} from "@/lib/goodTrouble/tableProbe";

describe("tableProbe", () => {
  it("maps exists to PASS readiness status", () => {
    expect(tableProbeToReadinessStatus("exists")).toBe("PASS");
  });

  it("maps missing to FAIL readiness status", () => {
    expect(tableProbeToReadinessStatus("missing")).toBe("FAIL");
  });

  it("maps unknown to UNKNOWN readiness status", () => {
    expect(tableProbeToReadinessStatus("unknown")).toBe("UNKNOWN");
  });

  it("classifies successful probe as exists", () => {
    const result = classifyTableProbeError(null, "hosted_partner_flow_handoffs");
    expect(result.state).toBe("exists");
  });

  it("classifies confirmed missing relation as missing", () => {
    const result = classifyTableProbeError(
      { code: "42P01", message: 'relation "hosted_partner_flow_handoffs" does not exist' },
      "hosted_partner_flow_handoffs",
    );
    expect(result.state).toBe("missing");
    expect(result.detail).toContain("confirmed missing");
  });

  it("classifies PGRST205 schema cache as unknown, not missing", () => {
    const result = classifyTableProbeError(
      {
        code: "PGRST205",
        message: "Could not find the table public.hosted_partner_flow_handoffs in the schema cache",
      },
      "hosted_partner_flow_handoffs",
    );
    expect(result.state).toBe("unknown");
    expect(result.diagnostic?.category).toBe("schema_cache_unavailable");
    expect(result.detail).not.toContain("missing");
  });

  it("classifies permission denied as unknown", () => {
    const result = classifyTableProbeError(
      { code: "42501", message: "permission denied for table partner_integration_events" },
      "partner_integration_events",
    );
    expect(result.state).toBe("unknown");
    expect(result.diagnostic?.category).toBe("permission_denied");
  });

  it("classifies RPC unavailable style errors as unknown", () => {
    const result = classifyTableProbeError(
      {
        code: "PGRST202",
        message: "Could not find the function public.to_regclass(relation) in the schema cache",
      },
      "hosted_partner_flow_handoffs",
    );
    expect(result.state).toBe("unknown");
    expect(result.state).not.toBe("missing");
  });

  it("classifies unexpected query errors as unknown", () => {
    const result = classifyTableProbeError(
      { code: "XX000", message: "unexpected internal error" },
      "partner_integration_events",
    );
    expect(result.state).toBe("unknown");
    expect(result.diagnostic?.category).toBe("unknown_query_error");
  });

  it("does not leak raw PostgREST error message bodies in diagnostics", () => {
    const rawMessage = "permission denied for table secret_table";
    const result = classifyTableProbeError(
      { code: "42501", message: rawMessage },
      "secret_table",
    );
    expect(result.detail).not.toContain(rawMessage);
    expect(result.detail).toContain("permission denied");
    expect(result.diagnostic?.code).toBe("42501");
  });

  it("uses PostgREST head probe and returns exists on success", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(async () => ({ error: null })),
      })),
    }));
    const client = { from } as unknown as Parameters<typeof probeSupabaseTable>[0];
    const result = await probeSupabaseTable(client, "hosted_partner_flow_handoffs");
    expect(result.state).toBe("exists");
    expect(from).toHaveBeenCalledWith("hosted_partner_flow_handoffs");
  });

  it("returns unknown for schema-cache false negative on existing table", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(async () => ({
          error: {
            code: "PGRST205",
            message: "Could not find the table public.partner_integration_events in the schema cache",
          },
        })),
      })),
    }));
    const client = { from } as unknown as Parameters<typeof probeSupabaseTable>[0];
    const result = await probeSupabaseTable(client, "partner_integration_events");
    expect(result.state).toBe("unknown");
    expect(result.state).not.toBe("missing");
  });
});
