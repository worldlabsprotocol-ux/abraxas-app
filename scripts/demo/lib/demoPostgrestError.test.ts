import { describe, expect, it } from "vitest";
import {
  classifyPostgrestError,
  classifyPostgrestProbeError,
  computeSafeRestProbeFingerprint,
  formatClassifiedPostgrestError,
  formatRestProbeDiagnostic,
} from "./demoPostgrestError";

describe("demoPostgrestError", () => {
  it("classifies 42P01 as table_missing", () => {
    const result = classifyPostgrestError({
      code: "42P01",
      message: 'relation "partners" does not exist',
    });
    expect(result.category).toBe("table_missing");
    expect(result.code).toBe("42P01");
  });

  it("classifies 42501 as permission_denied", () => {
    const result = classifyPostgrestProbeError(
      {
        code: "42501",
        message: "permission denied for table partners",
      },
      { operation: "head_count", table: "partners", httpStatus: 403 },
    );
    expect(result.category).toBe("permission_denied");
    expect(formatClassifiedPostgrestError(result)).toContain("permission_denied");
    expect(formatClassifiedPostgrestError(result)).toContain("op=head_count");
    expect(formatClassifiedPostgrestError(result)).toContain("table=partners");
    expect(formatClassifiedPostgrestError(result)).not.toContain("permission denied for table");
  });

  it("classifies PGRST205 as schema_cache_unavailable", () => {
    const result = classifyPostgrestProbeError(
      {
        code: "PGRST205",
        message: "Could not find the table public.partners in the schema cache",
      },
      { operation: "head_count", table: "partners", httpStatus: 404 },
    );
    expect(result.category).toBe("schema_cache_unavailable");
    expect(formatRestProbeDiagnostic(result)).toContain("http=404");
    expect(formatRestProbeDiagnostic(result)).toContain("fp=");
  });

  it("classifies PGRST204 as schema_cache_unavailable", () => {
    const result = classifyPostgrestError({
      code: "PGRST204",
      message: "not found in the schema cache",
    });
    expect(result.category).toBe("schema_cache_unavailable");
  });

  it("classifies malformed service-role credential without leaking message", () => {
    const result = classifyPostgrestProbeError(
      {
        code: "",
        message: "Invalid JWT: unable to parse compact serialization",
      },
      { operation: "head_count", table: "partners", httpStatus: 401 },
    );
    expect(result.category).toBe("authentication_failed");
    expect(formatRestProbeDiagnostic(result)).not.toContain("JWT");
    expect(formatRestProbeDiagnostic(result)).not.toContain("compact");
  });

  it("classifies invalid credential when message indicates malformed JWT", () => {
    const result = classifyPostgrestProbeError(
      {
        code: "unknown",
        message: "JWT malformed",
      },
      { operation: "head_count", table: "partners" },
    );
    expect(result.category).toBe("invalid_credential");
    expect(formatRestProbeDiagnostic(result)).not.toContain("malformed");
  });

  it("classifies HTTP 401 as authentication_failed", () => {
    const result = classifyPostgrestProbeError(
      { code: "", message: "" },
      { operation: "head_count", table: "partners", httpStatus: 401 },
    );
    expect(result.category).toBe("authentication_failed");
    expect(formatRestProbeDiagnostic(result)).toContain("http=401");
  });

  it("classifies HTTP 403 with empty PostgREST code as authorization_denied", () => {
    const result = classifyPostgrestProbeError(
      { code: "", message: "" },
      { operation: "head_count", table: "partners", httpStatus: 403 },
    );
    expect(result.category).toBe("authorization_denied");
    expect(formatRestProbeDiagnostic(result)).toContain("http=403");
  });

  it("classifies PostgREST JWT error codes as authentication_failed", () => {
    const result = classifyPostgrestProbeError(
      { code: "PGRST301", message: "JWT expired" },
      { operation: "head_count", table: "partners", httpStatus: 401 },
    );
    expect(result.category).toBe("authentication_failed");
    expect(result.code).toBe("PGRST301");
    expect(formatRestProbeDiagnostic(result)).not.toContain("expired");
  });

  it("classifies HTTP status 0 as network_or_transport_failure", () => {
    const result = classifyPostgrestProbeError(
      {
        code: "",
        message: "FetchError: self signed certificate in certificate chain",
      },
      { operation: "head_count", table: "partners", httpStatus: 0 },
    );
    expect(result.category).toBe("network_or_transport_failure");
    expect(formatRestProbeDiagnostic(result)).toContain("http=0");
    expect(formatRestProbeDiagnostic(result)).not.toContain("certificate");
    expect(formatRestProbeDiagnostic(result)).not.toContain("FetchError");
  });

  it("classifies empty message as unknown_query_error with code", () => {
    const result = classifyPostgrestError({ code: "XX000", message: "" });
    expect(result.category).toBe("unknown_query_error");
    expect(result.detail).toBe("PostgREST query failed [XX000]");
  });

  it("classifies unknown errors without leaking message content", () => {
    const result = classifyPostgrestProbeError(
      {
        code: "99999",
        message: "secret internal detail should not appear",
        details: "row data",
        hint: "sql hint",
      },
      { operation: "select_limit", table: "partners", httpStatus: 500 },
    );
    expect(result.category).toBe("unknown_query_error");
    expect(formatRestProbeDiagnostic(result)).not.toContain("secret");
    expect(formatRestProbeDiagnostic(result)).not.toContain("row data");
    expect(formatRestProbeDiagnostic(result)).toContain("http=500");
    expect(formatRestProbeDiagnostic(result)).toContain("[unknown]");
    expect(formatRestProbeDiagnostic(result)).toContain("fp=");
  });

  it("computes stable fingerprints for identical probe inputs", () => {
    const input = {
      category: "unknown_query_error" as const,
      code: "unknown",
      httpStatus: 502,
      operation: "head_count",
      table: "partners",
    };
    expect(computeSafeRestProbeFingerprint(input)).toBe(
      computeSafeRestProbeFingerprint(input),
    );
    expect(computeSafeRestProbeFingerprint(input)).toHaveLength(12);
  });
});
