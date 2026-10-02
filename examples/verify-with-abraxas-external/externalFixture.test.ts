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
});
