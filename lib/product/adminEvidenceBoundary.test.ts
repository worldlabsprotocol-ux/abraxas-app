// FILE: lib/product/adminEvidenceBoundary.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { valueEvidenceLeaks } from "@/lib/partner/valueEvidence";
import { designPartnerLeaks } from "@/lib/partner/designPartnerProgram";

describe("admin evidence boundaries", () => {
  it("requires admin route access on value-evidence API", () => {
    const src = readFileSync(join(process.cwd(), "app/api/admin/value-evidence/route.ts"), "utf8");
    expect(src).toContain("requireAdminRouteAccess");
    expect(src).toContain("valueEvidenceLeaks");
    expect(src).toContain("designPartnerLeaks");
  });

  it("does not expose fundraising matrix in partner pilot progress builder", () => {
    const src = readFileSync(join(process.cwd(), "lib/partner/designPartnerProgram/partnerProgress.ts"), "utf8");
    expect(src).not.toMatch(/fundraising_matrix|investor_claims/);
  });

  it("rejects sensitive fields in value and design partner payloads", () => {
    const sensitive = { fundraising_matrix: [], investor_claims: [], legal_name: "Jane Doe" };
    expect(valueEvidenceLeaks(sensitive).length).toBeGreaterThan(0);
    expect(designPartnerLeaks(sensitive).length).toBeGreaterThan(0);
  });

  it("uses executive dashboard instead of JSON-only admin page", () => {
    const page = readFileSync(join(process.cwd(), "app/admin/value-evidence/page.tsx"), "utf8");
    expect(page).toContain("ValueEvidenceDashboard");
    expect(page).not.toContain("JSON.stringify");
  });
});
