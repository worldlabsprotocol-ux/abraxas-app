// FILE: lib/gtm/gtmAlignment.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  GTM_ONE_SENTENCE_DESCRIPTION,
  GTM_PRIMARY_CTA_HREF,
  GTM_PRIMARY_CTA_LABEL,
} from "./contract";
import {
  parseDiscoveryAnswers,
  serializeDiscoveryAnswers,
  discoveryAnswersFromSearchParams,
} from "./discovery";
import { routeFromDiscovery } from "./routing";
import {
  buildSanitizedAcquisitionEvent,
  sanitizeAcquisitionEventAttributes,
} from "./acquisitionEvents";
import {
  listGtmAcquisitionEventsForTests,
  recordGtmAcquisitionEvent,
  resetGtmAcquisitionEventsForTests,
} from "./acquisitionStore";
import { scanGtmCopyForProhibitedClaims, assertGtmCopySafe } from "./claimSafety";
import {
  INSTITUTIONAL_PROOF_ROLE,
  INSTITUTIONAL_REFERENCE_METRICS,
} from "./proofPack";
import {
  HOME_PRIMARY_CTA,
  HOME_PRIMARY_CTA_HREF,
} from "./homeCopy";
import {
  INTEGRATION_STUDIO_OUTCOMES,
  INTEGRATION_STUDIO_OUTCOME_LIST,
} from "./integrationStudioOutcomes";
import { PARTNER_ONBOARDING_IN_DEVELOPMENT } from "@/lib/partner/partnerOnboardingPositioning";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const sampleDiscovery = {
  industry: "fintech_digital_assets" as const,
  app_count_band: "2_3" as const,
  has_kyc_vendor: "yes" as const,
  primary_pain: "repeat_verification" as const,
};

describe("gtm alignment", () => {
  beforeEach(() => {
    resetGtmAcquisitionEventsForTests();
  });

  it("surfaces buyer-primary homepage message and keep-provider language", () => {
    const hero = read("components/home/cinematic/thesis/CinematicHero.tsx");
    const copy = read("lib/home/cinematicHomeCopy.ts");
    const buyer = read("components/home/HomeBuyerContextSection.tsx");
    expect(copy).toMatch(/Keep your KYC provider/i);
    expect(copy).toMatch(/Stop re-verifying/i);
    expect(buyer).toContain("HOME_KEEP_KYC_PROVIDER");
    expect(hero).toContain("CINEMATIC_CTA_PRIMARY");
    expect(HOME_PRIMARY_CTA).toBe(GTM_PRIMARY_CTA_LABEL);
    expect(HOME_PRIMARY_CTA_HREF).toBe(GTM_PRIMARY_CTA_HREF);
  });

  it("does not make Passport the buyer-primary CTA", () => {
    const cinematicCopy = read("lib/home/cinematicHomeCopy.ts");
    expect(cinematicCopy).not.toMatch(/CINEMATIC_CTA_PRIMARY = "Open Passport"/);
    expect(GTM_PRIMARY_CTA_HREF).not.toBe("/passport");
  });

  it("labels institutional evidence as reference proof without production overclaim", () => {
    expect(INSTITUTIONAL_PROOF_ROLE.classification).toBe("reference_proof");
    expect(INSTITUTIONAL_PROOF_ROLE.limits.toLowerCase()).toContain("reference");
    expect(INSTITUTIONAL_PROOF_ROLE.limits.toLowerCase()).not.toMatch(/live production institutional deployment is complete/i);
    const proofPage = read("components/gtm/GtmProofPackContent.tsx");
    expect(proofPage).toMatch(/reference harness/i);
    expect(INSTITUTIONAL_REFERENCE_METRICS.raw_kyc_recollections).toBe(0);
  });

  it("runs four-question discovery with privacy-safe persistence", () => {
    const serialized = serializeDiscoveryAnswers(sampleDiscovery);
    const parsed = parseDiscoveryAnswers(JSON.parse(serialized));
    expect(parsed).toEqual(expect.objectContaining(sampleDiscovery));
    expect(serialized).not.toMatch(/email|dob|legal_name/i);
  });

  it("rejects invalid discovery payloads", () => {
    expect(parseDiscoveryAnswers({ industry: "bad" })).toBeNull();
    expect(
      discoveryAnswersFromSearchParams(
        new URLSearchParams("industry=fintech_digital_assets&app_count_band=2_3&has_kyc_vendor=yes&primary_pain=repeat_verification"),
      ),
    ).toEqual(expect.objectContaining(sampleDiscovery));
  });

  it("routes multi-app fintech with KYC vendor to institutional reuse proof", () => {
    const route = routeFromDiscovery(sampleDiscovery);
    expect(route.proof_pack).toBe("institutional_reuse");
    expect(route.show_institutional_reference).toBe(true);
    expect(route.emphasize_keep_provider).toBe(true);
    expect(route.recommended_studio_href).toContain("reuse_across_app");
  });

  it("routes over-collection pain to narrow-result proof", () => {
    const route = routeFromDiscovery({
      ...sampleDiscovery,
      primary_pain: "over_collection",
    });
    expect(route.proof_pack).toBe("narrow_disclosure");
    expect(route.show_good_trouble).toBe(true);
    expect(route.show_institutional_reference).toBe(false);
  });

  it("routes age-restricted commerce to Good Trouble", () => {
    const route = routeFromDiscovery({
      ...sampleDiscovery,
      industry: "age_restricted_commerce",
    });
    expect(route.show_good_trouble).toBe(true);
    expect(route.proof_pack).toBe("narrow_disclosure");
  });

  it("routes unknown discovery to generic reusable explanation", () => {
    const route = routeFromDiscovery(null);
    expect(route.proof_pack).toBe("generic_reusable");
    expect(route.summary.toLowerCase()).toContain("reuse");
  });

  it("exposes Integration Studio outcome-first entry with advanced paths available", () => {
    expect(INTEGRATION_STUDIO_OUTCOME_LIST.length).toBeGreaterThanOrEqual(5);
    expect(INTEGRATION_STUDIO_OUTCOMES.reuse_across_app.icpPriority).toBe(true);
    const studio = read("app/developers/integration-studio/IntegrationStudioClient.tsx");
    expect(studio).toContain("IntegrationStudioOutcomePicker");
    expect(studio).toContain("Advanced integration path");
    expect(studio).toContain("INTEGRATION_STUDIO_PATHS.map");
  });

  it("fixes stale pairwise availability in partner onboarding", () => {
    const available = read("lib/partner/partnerOnboardingPositioning.ts");
    expect(available).toMatch(/application-specific subject references/i);
    expect(available).toMatch(/availability: "available_now"/);
    expect(PARTNER_ONBOARDING_IN_DEVELOPMENT.some((item) => item.id === "pairwise-identity")).toBe(false);
  });

  it("sanitizes acquisition telemetry and blocks freeform PII dimensions", () => {
    const sanitized = sanitizeAcquisitionEventAttributes({
      industry_category: "fintech_digital_assets",
      email: "secret@example.com",
      other_text: "some freeform answer",
      primary_pain: "other",
    });
    expect(sanitized.industry_category).toBe("fintech_digital_assets");
    expect(sanitized.email).toBeUndefined();
    expect(sanitized.other_text).toBeUndefined();

    const event = buildSanitizedAcquisitionEvent({
      event_type: "discovery_completed",
      attributes: sanitized,
    });
    recordGtmAcquisitionEvent(event);
    expect(listGtmAcquisitionEventsForTests()[0]?.event_type).toBe("discovery_completed");
  });

  it("passes claim safety audit on core GTM copy corpus", () => {
    const corpus = [
      GTM_ONE_SENTENCE_DESCRIPTION,
      read("lib/home/cinematicHomeCopy.ts"),
      read("lib/integrate/businessPageCopy.ts"),
      read("lib/gtm/proofPack.ts"),
      read("components/home/HomeTwoAppReferenceProof.tsx"),
    ].join("\n");
    expect(scanGtmCopyForProhibitedClaims(corpus)).toEqual([]);
    expect(() => assertGtmCopySafe(GTM_ONE_SENTENCE_DESCRIPTION, "one_sentence")).not.toThrow();
  });

  it("keeps homepage guard critical shell markers", () => {
    const shell = read("components/redesign/RedesignHome.tsx");
    expect(shell).toContain("CinematicHero");
    expect(shell).toContain("HomeGoodTroubleIntegration");
    expect(shell).toContain("HomeAudiencePanels");
    expect(shell).toContain("HomeTrustClose");
    expect(shell).toContain("HomeTwoAppReferenceProof");
  });

  it("preserves reduced-motion usage on new buyer sections", () => {
    expect(read("components/home/HomeBuyerContextSection.tsx")).toContain("useReducedMotion");
  });
});
