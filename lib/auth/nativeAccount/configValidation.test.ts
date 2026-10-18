import { describe, expect, it } from "vitest";
import { validateNativeAuthRuntimeConfig } from "./configValidation";

describe("validateNativeAuthRuntimeConfig", () => {
  it("forbids memory store in production", () => {
    const result = validateNativeAuthRuntimeConfig({
      ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
      NODE_ENV: "production",
      ABRAXAS_NATIVE_ACCOUNT_MEMORY: "true",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("memory_forbidden_in_production");
  });

  it("requires session secret when enabled", () => {
    const result = validateNativeAuthRuntimeConfig({
      ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
      NODE_ENV: "production",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("session_secret_missing");
  });

  it("requires sovereign mode in production when native auth is enabled", () => {
    const result = validateNativeAuthRuntimeConfig({
      ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
      NODE_ENV: "production",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("sovereign_mode_required");
  });

  it("requires independent database URL in sovereign production mode", () => {
    const result = validateNativeAuthRuntimeConfig({
      ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
      ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT: "1",
      NODE_ENV: "production",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("sovereign_database_missing");
  });
});
