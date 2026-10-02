import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FIXTURE_ROOT = resolve(process.cwd(), "examples/verify-with-abraxas-external");
const PRIVILEGED = [
  /requireSupabaseAdmin/,
  /credential_claims/,
  /decision_receipts\/service/,
  /getReceiptById/,
  /lib\/admin/,
  /lib\/supabase\/admin/,
  /lib\/provenance\//,
  /lib\/goodTrouble\//,
];

const FORBIDDEN_CORRECTNESS_PATTERNS = [
  /^const completedActions = new Set/m,
  /^const STORE = new Map/m,
];

function listTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    if (entry.name.endsWith(".ts")) return [full];
    return [];
  });
}

describe("verify-with-abraxas external fixture import boundary", () => {
  it("fixture sources import only public partner kit surface", () => {
    for (const file of listTsFiles(join(FIXTURE_ROOT, "lib"))) {
      const source = readFileSync(file, "utf8");
      for (const pattern of PRIVILEGED) {
        expect(source, `${file} must not match ${pattern}`).not.toMatch(pattern);
      }
      expect(source).toMatch(/integrationKit/);
    }
  });

  it("production flow modules do not use module-scoped correctness Maps/Sets", () => {
    for (const file of ["lib/flow.ts", "lib/partnerKit.ts", "lib/config.ts"]) {
      const source = readFileSync(join(FIXTURE_ROOT, file), "utf8");
      for (const pattern of FORBIDDEN_CORRECTNESS_PATTERNS) {
        expect(source, `${file} must not use module singleton ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("store factories are injectable and labeled for test/local simulation", () => {
    const requestStore = readFileSync(join(FIXTURE_ROOT, "lib/partnerRequestStore.ts"), "utf8");
    const actionStore = readFileSync(join(FIXTURE_ROOT, "lib/protectedActionStore.ts"), "utf8");
    expect(requestStore).toMatch(/TEST\/LOCAL ONLY/);
    expect(actionStore).toMatch(/TEST\/LOCAL ONLY/);
    expect(requestStore).toMatch(/createExternalPartnerRequestStore/);
  });
});
