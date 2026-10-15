// FILE: lib/passport/build571.stagingReadiness.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildStagingReadiness571 } from "./stagingReadiness571";

describe("Build #571 staging readiness baseline", () => {
  it("lists ten dependency areas with explicit status", () => {
    const items = buildStagingReadiness571({
      env: {
        ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
        ABRAXAS_DATABASE_URL: "postgresql://postgres:***@127.0.0.1:5432/test",
        NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID: "public-client",
        ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY: "[]",
        ABRAXAS_PASSPORT_CREDENTIAL_SIGNING_KEY_ID: "key",
        ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL: "https://publisher.example",
        ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS: "[]",
        ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: "[]",
        ABRAXAS_SIGNING_KEY_ID: "receipt-key",
      },
      productionBuildPresent: true,
      tableExists: (t) =>
        [
          "passport_reusable_credentials",
          "passport_holder_possession_keys",
          "partner_policies",
        ].includes(t),
    });
    expect(items).toHaveLength(10);
    expect(items.find((i) => i.id === "wallet_auth")?.status).toBe("ready");
    expect(items.find((i) => i.id === "idv_review")?.status).toBe("blocked");
  });

  it("includes design partner acceptance package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/partner-handoff/design-partner-acceptance.md"),
      "utf8",
    );
    expect(doc).toContain("independently verifies");
    expect(doc).not.toMatch(/—|–/);
  });
});
