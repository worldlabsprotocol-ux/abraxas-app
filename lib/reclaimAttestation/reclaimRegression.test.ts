import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planEligibilityMethods, resolvePackForEligibility } from "@/lib/partner/eligibilityMethods";
import { studioPublicCatalog } from "@/lib/partner/integrationStudio/catalog";
import { starterKitPublicCatalog } from "@/lib/partner/starterKit/contract";
import { projectIssuerTrustRegistry } from "@/lib/verification/issuerTrust/project";
import { SELECTIVE_DISCLOSURE_NOTICE } from "@/lib/privacy/selectiveDisclosure";

describe("reclaim adapter regressions", () => {
  it("keeps Partner Flow, disclosure, reusable facts, issuer registry, receipts, webhooks, Studio, and Starter Kits intact", () => {
    const pack = resolvePackForEligibility("age_21_retail")!;
    const plan = planEligibilityMethods({ pack, privacyPreservingAvailable: true });
    expect(plan.identity_is_default).toBe(false);
    expect(plan.methods.some((method) => method.id === "privacy_preserving")).toBe(true);

    const studio = studioPublicCatalog();
    expect(studio.reclaim_private_attestations.origin_bound).toBe(true);
    expect(JSON.stringify(studio.reclaim_private_attestations)).not.toMatch(/https:\/\/.*\/api\/reclaim\/callback/);
    expect(studio.reclaim_private_attestations.app_secret_in_browser).toBe(false);
    expect(studio.selective_disclosure.notice).toBe(SELECTIVE_DISCLOSURE_NOTICE);
    expect(starterKitPublicCatalog().issues_receipts).toBe(false);

    const registry = projectIssuerTrustRegistry();
    expect(registry.reclaim.google_is_eligibility).toBe(false);
    expect(registry.activates_mainnet).toBe(false);

    const docs = readFileSync(join(process.cwd(), "app/docs/reclaim-private-attestations/page.tsx"), "utf8");
    expect(docs).toMatch(/DEMO uses the isolated demo host/);
    expect(docs).toMatch(/cannot\s+choose the callback URL/);
    const kitReadme = readFileSync(join(process.cwd(), "lib/partner/starterKit/files.ts"), "utf8");
    expect(kitReadme).toMatch(/never receive the raw proof/i);
  });
});
