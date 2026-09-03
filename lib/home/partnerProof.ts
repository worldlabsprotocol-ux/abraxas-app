// FILE: lib/home/partnerProof.ts
// Public partner proof cards — authorized names/logos only.

export type PublicPartnerProofStatus = "pilot_testing" | "integration_testing";

export interface PublicPartnerProofCard {
  id: string;
  /** Display name — only when public-name permission is confirmed */
  displayName?: string;
  status: PublicPartnerProofStatus;
  summary?: string;
  journeyHref?: string;
  logoSrc?: string;
}

export const HOME_PARTNER_PROOF_HEADING = "Built with real partners";

export const HOME_PARTNER_PROOF_SUBHEAD =
  "Abraxas is being tested through its first relying-partner integration—turning private verification into a real customer journey.";

/** Good Trouble name/logo withheld until explicit public permission is confirmed. */
export const HOME_PARTNER_PROOF_FALLBACK = {
  title: "First relying-partner pilot",
  badge: "Integration testing underway",
  summary: "Private eligibility verification for an age-gated retail experience.",
  journeyHref: "/pilot-journey",
} as const;

export const HOME_PARTNER_PROOF_CTA = "See the pilot journey";

export function resolveHomePartnerProofCards(
  authorized: PublicPartnerProofCard[] = [],
): Array<{ title: string; badge: string; summary: string; journeyHref: string; logoSrc?: string }> {
  if (authorized.length === 0) {
    return [{
      title: HOME_PARTNER_PROOF_FALLBACK.title,
      badge: HOME_PARTNER_PROOF_FALLBACK.badge,
      summary: HOME_PARTNER_PROOF_FALLBACK.summary,
      journeyHref: HOME_PARTNER_PROOF_FALLBACK.journeyHref,
    }];
  }

  return authorized.map((card) => ({
    title: card.displayName ?? HOME_PARTNER_PROOF_FALLBACK.title,
    badge: card.status === "pilot_testing" ? "Pilot integration · Testing" : "Integration testing underway",
    summary: card.summary ?? HOME_PARTNER_PROOF_FALLBACK.summary,
    journeyHref: card.journeyHref ?? HOME_PARTNER_PROOF_FALLBACK.journeyHref,
    logoSrc: card.logoSrc,
  }));
}
