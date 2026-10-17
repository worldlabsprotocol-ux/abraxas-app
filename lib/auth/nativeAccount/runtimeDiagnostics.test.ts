import { describe, expect, it } from "vitest";
import { nativeAccountMemoryStoreEnabled } from "./featureFlag";
import { getNativeAuthRuntimeDiagnostics, interpretNativeAuthFlagState } from "./runtimeDiagnostics";

describe("nativeAccountMemoryStoreEnabled", () => {
  it("honors explicit false even when VITEST is set", () => {
    expect(
      nativeAccountMemoryStoreEnabled({
        NODE_ENV: "development",
        VITEST: "true",
        ABRAXAS_NATIVE_ACCOUNT_MEMORY: "false",
      }),
    ).toBe(false);
  });

  it("uses Postgres when staging Supabase URL is configured", () => {
    expect(
      nativeAccountMemoryStoreEnabled({
        NODE_ENV: "development",
        VITEST: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
      }),
    ).toBe(false);
  });
});

describe("interpretNativeAuthFlagState", () => {
  it("detects unset vs enabled vs disabled without exposing values", () => {
    expect(interpretNativeAuthFlagState({})).toBe("unset");
    expect(interpretNativeAuthFlagState({ ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true" })).toBe("enabled");
    expect(interpretNativeAuthFlagState({ ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "false" })).toBe("disabled");
  });
});

describe("getNativeAuthRuntimeDiagnostics", () => {
  it("reports disabled when flag unset on production-like env", () => {
    const d = getNativeAuthRuntimeDiagnostics({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
      ABRAXAS_BROWSER_SESSION_SECRET: "x".repeat(32),
    });
    expect(d.enabled).toBe(false);
    expect(d.config_ok).toBe(false);
    expect(d.config_code).toBe("disabled");
    expect(d.supabase_project_ref).toBe("ocntwbxarpjeixdnzide");
  });

  it("reports ready when flag and secret configured", () => {
    const d = getNativeAuthRuntimeDiagnostics({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "y".repeat(32),
      NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
    });
    expect(d.enabled).toBe(true);
    expect(d.config_ok).toBe(true);
    expect(d.config_code).toBeNull();
    expect(d.memory_store).toBe(false);
  });
});
