import { describe, expect, it } from "vitest";
import { resolveNativeAuthOperational } from "./operational";

describe("resolveNativeAuthOperational", () => {
  it("is not operational when flag on but schema missing", () => {
    const r = resolveNativeAuthOperational({
      schema: { ok: false, code: "migration_144_missing", migrations: { migration_144: false, migration_145_atomic_rpc: false } },
      env: {
        ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
        ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
        NODE_ENV: "production",
      },
    });
    expect(r.flag_enabled).toBe(true);
    expect(r.operational).toBe(false);
    expect(r.degraded_reason).toBe("migration_144_missing");
  });

  it("is operational when flag, config, and schema are ready", () => {
    const r = resolveNativeAuthOperational({
      schema: { ok: true, code: null, migrations: { migration_144: true, migration_145_atomic_rpc: true } },
      env: {
        ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
        ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
        NODE_ENV: "production",
      },
    });
    expect(r.operational).toBe(true);
    expect(r.degraded_reason).toBeNull();
  });
});
