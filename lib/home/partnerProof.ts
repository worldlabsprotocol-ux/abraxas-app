// FILE: lib/home/partnerProof.ts
// Public partner proof cards, authorized names/logos only.

export type PublicPartnerProofStatus = "pilot_testing" | "integration_testing";

export interface PublicPartnerProofCard {
  id: string;
  /** Display name, only when public-name permission is confirmed */
  displayName?: string;
  status: PublicPartnerProofStatus;
  summary?: string;
  journeyHref?: string;
  logoSrc?: string;
}

export const HOME_PARTNER_PROOF_HEADING = "A sandbox example you can try";

export const HOME_PARTNER_PROOF_SUBHEAD =
  "Good Trouble is a labeled sandbox Partner Flow. It is not a live checkout, booking, or payment.";

export const HOME_PARTNER_PROOF_FALLBACK = {
  title: "Good Trouble",
  badge: "Sandbox example",
  summary: "Prove 21+ eligibility. The partner receives only the result. Evidence stays private.",
  journeyHref: "/good-trouble",
} as const;

export const HOME_PARTNER_PROOF_CTA = "Try the sandbox example";

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
