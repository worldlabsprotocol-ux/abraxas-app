import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { recordHolderSessionDiagnostic } from "./holderSessionDiagnostic";

describe("holder session diagnostics", () => {
  it("records only route, status, safe category, and a random correlation ID", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const response = recordHolderSessionDiagnostic(
        NextResponse.json({ ok: false }, { status: 401 }),
        "self_attestation",
        "authentication",
      );
      const id = response.headers.get("X-Abraxas-Diagnostic-Id");
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(info).toHaveBeenCalledTimes(1);
      expect(info.mock.calls[0]?.[0]).toBe("[holder-session-diagnostic]");
      expect(JSON.parse(String(info.mock.calls[0]?.[1]))).toEqual({
        route: "self_attestation",
        status: 401,
        category: "authentication",
        correlation_id: id,
      });
    } finally {
      info.mockRestore();
    }
  });
});
