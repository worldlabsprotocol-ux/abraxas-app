// FILE: lib/gtm/routing.ts
// Deterministic GTM routing from discovery answers.

import type { GtmDiscoveryAnswers, GtmRoutingResult } from "./contract";
import { INTEGRATION_STUDIO_OUTCOMES } from "./integrationStudioOutcomes";

function isMultiApp(appCountBand: GtmDiscoveryAnswers["app_count_band"]): boolean {
  return appCountBand === "2_3" || appCountBand === "4_plus";
}

function isFintechIndustry(industry: GtmDiscoveryAnswers["industry"]): boolean {
  return industry === "fintech_digital_assets" || industry === "wallet_infrastructure";
}

export function routeFromDiscovery(answers: GtmDiscoveryAnswers | null): GtmRoutingResult {
  if (!answers) {
    return {
      proof_pack: "generic_reusable",
      recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.reuse_across_app.studioHref,
      headline: "Reusable eligibility without redistributing identity files",
      summary:
        "Abraxas turns trusted verification into application-specific answers your server can verify — with reuse, consent, and revocation when policies allow.",
      show_institutional_reference: true,
      show_good_trouble: true,
      emphasize_keep_provider: true,
    };
  }

  if (answers.industry === "age_restricted_commerce") {
    return {
      proof_pack: "narrow_disclosure",
      recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.narrow_without_extra_id.studioHref,
      headline: "Confirm eligibility without collecting birth dates or ID files",
      summary:
        "Good Trouble shows a narrow 21+ result in a production-shaped flow. Abraxas returns the decision your application needs — not the underlying identity package.",
      show_institutional_reference: false,
      show_good_trouble: true,
      emphasize_keep_provider: answers.has_kyc_vendor === "yes",
    };
  }

  if (answers.primary_pain === "over_collection") {
    return {
      proof_pack: "narrow_disclosure",
      recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.narrow_without_extra_id.studioHref,
      headline: "Receive the decision — not the identity file",
      summary:
        "See how a relying application can verify eligibility while avoiding unnecessary identity fields in its payload.",
      show_institutional_reference: false,
      show_good_trouble: true,
      emphasize_keep_provider: answers.has_kyc_vendor === "yes",
    };
  }

  if (answers.primary_pain === "slow_launches") {
    return {
      proof_pack: "policy_integration",
      recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.new_eligibility_rule.studioHref,
      headline: "Add eligibility requirements without rebuilding onboarding",
      summary:
        "Integration Studio and policy packs help you configure a new gate and generate integration code without starting from scratch.",
      show_institutional_reference: false,
      show_good_trouble: false,
      emphasize_keep_provider: answers.has_kyc_vendor === "yes",
    };
  }

  if (
    isMultiApp(answers.app_count_band) &&
    answers.has_kyc_vendor === "yes" &&
    (isFintechIndustry(answers.industry) ||
      answers.primary_pain === "repeat_verification" ||
      answers.primary_pain === "auditability")
  ) {
    return {
      proof_pack: "institutional_reuse",
      recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.reuse_across_app.studioHref,
      headline: "Reuse verified evidence across a second application",
      summary:
        "Keep your existing KYC provider. Abraxas reference proof shows one provider verification supporting two application results — without raw KYC recollection.",
      show_institutional_reference: true,
      show_good_trouble: false,
      emphasize_keep_provider: true,
    };
  }

  if (isMultiApp(answers.app_count_band) && answers.primary_pain === "repeat_verification") {
    return {
      proof_pack: "institutional_reuse",
      recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.reuse_across_app.studioHref,
      headline: "Stop asking the same customer to verify again",
      summary:
        "When policies are compatible, existing verified evidence can satisfy a second workflow with fresh consent and revocation controls.",
      show_institutional_reference: true,
      show_good_trouble: true,
      emphasize_keep_provider: answers.has_kyc_vendor === "yes",
    };
  }

  return {
    proof_pack: "generic_reusable",
    recommended_studio_href: INTEGRATION_STUDIO_OUTCOMES.reuse_across_app.studioHref,
    headline: "Application-specific verified answers with reuse when compatible",
    summary:
      "Abraxas sits after your verification provider and controls what each application is authorized to learn from trusted evidence.",
    show_institutional_reference: true,
    show_good_trouble: true,
    emphasize_keep_provider: answers.has_kyc_vendor === "yes",
  };
}
