import { describe, expect, it } from "vitest";
import {
  classifyPostgrestError,
  formatClassifiedPostgrestError,
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
    const result = classifyPostgrestError({
      code: "42501",
      message: "permission denied for table partners",
    });
    expect(result.category).toBe("permission_denied");
    expect(formatClassifiedPostgrestError(result)).toContain("permission_denied");
    expect(formatClassifiedPostgrestError(result)).not.toContain("partners");
  });

  it("classifies PGRST205 as schema_cache_unavailable", () => {
    const result = classifyPostgrestError({
      code: "PGRST205",
      message: "Could not find the table public.partners in the schema cache",
    });
    expect(result.category).toBe("schema_cache_unavailable");
  });

  it("classifies PGRST204 as schema_cache_unavailable", () => {
    const result = classifyPostgrestError({
      code: "PGRST204",
      message: "not found in the schema cache",
    });
    expect(result.category).toBe("schema_cache_unavailable");
  });

  it("classifies empty message as unknown_query_error with code", () => {
    const result = classifyPostgrestError({ code: "XX000", message: "" });
    expect(result.category).toBe("unknown_query_error");
    expect(result.detail).toBe("PostgREST query failed [XX000]");
  });

  it("classifies unknown errors without leaking message content", () => {
    const result = classifyPostgrestError({
      code: "99999",
      message: "secret internal detail should not appear",
      details: "row data",
      hint: "sql hint",
    });
    expect(result.category).toBe("unknown_query_error");
    expect(formatClassifiedPostgrestError(result)).not.toContain("secret");
    expect(formatClassifiedPostgrestError(result)).not.toContain("row data");
  });
});
