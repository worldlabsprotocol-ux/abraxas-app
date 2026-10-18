import { describe, expect, it } from "vitest";
import {
  isNativeAccountDirectPostgresEnabled,
  nativeAccountPgExplicitlyEnabled,
  resolveNativeAccountDirectPostgresUrl,
} from "./nativeAccountPg";

describe("nativeAccountPg", () => {
  it("requires explicit flag for hybrid postgrest + direct pg", () => {
    expect(
      isNativeAccountDirectPostgresEnabled({
        ABRAXAS_NATIVE_ACCOUNT_PG: "true",
        ABRAXAS_DATABASE_URL: "postgresql://localhost:5432/abraxas",
        NODE_ENV: "production",
      }),
    ).toBe(true);
    expect(
      isNativeAccountDirectPostgresEnabled({
        ABRAXAS_DATABASE_URL: "postgresql://localhost:5432/abraxas",
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("resolves native account database URL", () => {
    expect(
      resolveNativeAccountDirectPostgresUrl({
        ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL: "postgresql://db.internal/native",
      }),
    ).toBe("postgresql://db.internal/native");
    expect(nativeAccountPgExplicitlyEnabled({ ABRAXAS_NATIVE_ACCOUNT_PG: "enabled" })).toBe(true);
  });
});
