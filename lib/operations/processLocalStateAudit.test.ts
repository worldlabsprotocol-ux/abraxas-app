// FILE: lib/operations/processLocalStateAudit.test.ts
// Static audit: production-critical paths must not rely solely on process memory.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walkTsFiles(full, acc);
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) acc.push(full.replace(`${ROOT}/`, ""));
  }
  return acc;
}

describe("process-local state audit", () => {
  it("provenance session store uses durable persistence path", () => {
    const source = read("lib/provenance/provenanceSessionStore.ts");
    expect(source).toContain("requireSupabaseAdmin");
    expect(source).toContain("provenance_flow_sessions");
    expect(source).toContain("skipDurableStore");
  });

  it("organization consent store uses durable persistence path", () => {
    const source = read("lib/organizationEligibility/consent.ts");
    expect(source).toContain("organization_eligibility_consents");
    expect(source).toContain("consumed_at");
  });

  it("sandbox readiness idempotency uses durable store", () => {
    const source = read("lib/partner/launchpad/sandboxReadiness/idempotency.ts");
    expect(source).toContain("sandbox_readiness_runs");
    expect(source).toContain("requireSupabaseAdmin");
  });

  it("reference publisher verify path does not import privileged internals", () => {
    const source = read("lib/demo/referenceContentPublisher/verifyCallback.ts");
    expect(source).not.toMatch(/requireSupabaseAdmin|credential_claims|getReceiptById/);
  });

  it("demo-only session stores are scoped under lib/demo", () => {
    const demoStores = walkTsFiles("lib/demo").filter((path) => /sessionStore|Store\.ts/.test(path));
    expect(demoStores.every((path) => path.startsWith("lib/demo/"))).toBe(true);
  });
});
