import { describe, expect, it } from "vitest";
import {
  isSovereignNativeAccountMode,
  validateSovereignNativeAccountDatabase,
} from "./sovereignNativeAccount";

describe("sovereignNativeAccount", () => {
  it("enables sovereign mode via explicit flag or postgres_direct backend", () => {
    expect(isSovereignNativeAccountMode({ ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1" })).toBe(true);
    expect(isSovereignNativeAccountMode({ ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct" })).toBe(true);
    expect(isSovereignNativeAccountMode({})).toBe(false);
  });

  it("rejects Supabase-hosted database URLs in sovereign mode", () => {
    const result = validateSovereignNativeAccountDatabase({
      ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
      ABRAXAS_DATABASE_URL: "postgresql://user:pass@db.ocntwbxarpjeixdnzide.supabase.co:5432/postgres",
    });
    expect(result).toEqual({ ok: false, code: "supabase_host_rejected" });
  });

  it("accepts independent PostgreSQL URLs", () => {
    const result = validateSovereignNativeAccountDatabase({
      ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
      ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@postgres.internal:5432/abraxas",
    });
    expect(result).toEqual({ ok: true });
  });
});
