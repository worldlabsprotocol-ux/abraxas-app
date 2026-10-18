import { describe, expect, it, vi } from "vitest";

describe("probeNativeAuthSchemaReady", () => {
  it("reports migration_144 missing when PostgREST returns PGRST205", async () => {
    vi.doMock("@/lib/persistence/admin", () => ({
      requirePersistenceAdmin: () => ({
        from: () => ({
          select: () => ({
            limit: async () => ({
              error: { code: "PGRST205", message: "Could not find the table" },
            }),
          }),
        }),
      }),
    }));
    vi.doMock("./featureFlag", () => ({
      nativeAccountMemoryStoreEnabled: () => false,
    }));

    const { probeNativeAuthSchemaReady } = await import("./schemaReadiness");
    const result = await probeNativeAuthSchemaReady({ NODE_ENV: "production" });
    expect(result.migrations.migration_144).toBe(false);
    expect(result.code).toBe("migration_144_missing");
    vi.resetModules();
  });
});
