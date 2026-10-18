import { describe, expect, it } from "vitest";
import { NativeAccountStoreUnavailableError } from "./storeErrors";
import {
  assertNativeAccountPersistenceBackend,
  nativeAccountUsesPostgrest,
} from "./nativeAccountPersistence";

describe("nativeAccountPersistence", () => {
  it("blocks PostgREST when sovereign mode is active without direct PG", () => {
    expect(
      nativeAccountUsesPostgrest({
        ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
        ABRAXAS_NATIVE_ACCOUNT_MEMORY: "0",
      }),
    ).toBe(false);
    expect(() =>
      assertNativeAccountPersistenceBackend({
        ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
        ABRAXAS_NATIVE_ACCOUNT_MEMORY: "0",
      }),
    ).toThrow(NativeAccountStoreUnavailableError);
  });

  it("allows PostgREST only in legacy hybrid mode", () => {
    expect(
      nativeAccountUsesPostgrest({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "key",
        ABRAXAS_NATIVE_ACCOUNT_MEMORY: "0",
      }),
    ).toBe(true);
  });
});
