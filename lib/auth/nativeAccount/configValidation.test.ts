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
});
