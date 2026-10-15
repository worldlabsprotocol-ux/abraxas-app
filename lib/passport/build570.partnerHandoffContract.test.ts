// FILE: lib/passport/build570.partnerHandoffContract.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseIndependentInstitutionConfig } from "@/lib/passport/reusableCredential/independentInstitutionConfig";

describe("Build #570 partner handoff contract", () => {
  it("parses institution template shape", () => {
    const raw = JSON.parse(
      readFileSync(
        join(process.cwd(), "docs/partner-handoff/passport-independent-verifier/example-institution.template.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const trust = raw.trust_env as Record<string, string>;
    const parsed = parseIndependentInstitutionConfig({
      partner_id: "institutional-rp-example",
      policy_id: "institutional-age-21-v1",
      trust_env: {
        ...trust,
        ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST: '{"bindings":[{"receipt_signing_key_id":"k","revocation_issuer_id":"i","snapshot_signing_key_ids":["k"]}]}',
      },
    });
    expect(parsed.ok).toBe(true);
  });

  it("documents operational CLI entrypoint in README", () => {
    const readme = readFileSync(
      join(process.cwd(), "docs/partner-handoff/passport-independent-verifier/README.md"),
      "utf8",
    );
    expect(readme).toContain("build-569:verify-bundle");
    expect(readme).toContain("--institution-config");
    expect(readme).not.toContain("verifyPassportInstitutionalBundleInMemoryForTests");
  });
});
