// FILE: lib/product/build576.productionReconciliation.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Build #576 production reconciliation", () => {
  it("exposes explicit zkLogin config route instead of NextAuth catch-all", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/auth/zklogin/config/route.ts"),
      "utf8",
    );
    expect(route).toContain("buildZkLoginPublicConfigStatus");
    expect(route).not.toContain("auth not configured");
  });

  it("documents passport reusable persistence requires postgres_direct adapter", () => {
    const env = readFileSync(join(process.cwd(), "lib/persistence/env.ts"), "utf8");
    const pgPool = readFileSync(join(process.cwd(), "lib/persistence/pgPool.ts"), "utf8");
    const directStore = readFileSync(
      join(process.cwd(), "lib/persistence/passportReusableCredentialDirectStore.ts"),
      "utf8",
    );
    const statusRoute = readFileSync(
      join(process.cwd(), "app/api/passport/reusable-credentials/status/route.ts"),
      "utf8",
    );
    expect(env).toContain('explicit === "postgres_direct"');
    expect(pgPool).toContain('resolvePersistenceBackend(env) !== "postgres_direct"');
    expect(directStore).toContain("queryAbraxasPg");
    expect(statusRoute).toContain("loadReusableCredentialLifecycleForHolderDirect");
    expect(env).toContain("supabase_postgrest");
  });

  it("documents misleading auth probe paths in public config status", () => {
    const lib = readFileSync(
      join(process.cwd(), "lib/sui/zklogin/publicConfigStatus.ts"),
      "utf8",
    );
    expect(lib).toContain("misleading_paths");
    expect(lib).toContain("GOOGLE_ZKLOGIN_CLIENT_ID");
    expect(lib).toContain("NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID");
    expect(lib).toContain("canonical_ids_aligned");
    expect(lib).toContain("authentication_operational");
  });
});
