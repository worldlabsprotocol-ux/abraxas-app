// FILE: lib/partner/partnerOnboardingPositioning.ts
// Centralized Partner Flow positioning — truthful available vs planned capability labels.

export type PartnerCapabilityAvailability = "available_now" | "in_development" | "planned";

export interface PartnerCapabilityItem {
  id: string;
  label: string;
  detail: string;
  availability: PartnerCapabilityAvailability;
}

export const PARTNER_ONBOARDING_HEADLINE = "One verification. Faster onboarding. Fewer forms.";

export const PARTNER_ONBOARDING_SUPPORTING_COPY =
  "Abraxas helps users prove eligibility and securely continue into partner experiences without repeatedly exposing sensitive identity information.";

export const PARTNER_ONBOARDING_FUTURE_EXPLAINER =
  "With explicit user consent, partners will be able to create or recover a local account from an Abraxas verification, request selected contact information, and unlock partner-specific benefits without requiring another password.";

export const PARTNER_ONBOARDING_FUTURE_LABEL = "In development";

export const PARTNER_ONBOARDING_AVAILABLE_NOW: PartnerCapabilityItem[] = [
  {
    id: "partner-flow",
    label: "Partner Flow",
    detail: "Browser redirect entry, policy evaluation, and privacy-preserving callback parameters.",
    availability: "available_now",
  },
  {
    id: "passport",
    label: "Abraxas Passport",
    detail: "Holder sign-in and optional identity capture when a partner policy requires it.",
    availability: "available_now",
  },
  {
    id: "policy-eligibility",
    label: "Policy-based eligibility verification",
    detail: "Partners define required claims; Abraxas returns approved, denied, or manual_review.",
    availability: "available_now",
  },
  {
    id: "signed-receipts",
    label: "Signed public receipts",
    detail: "Server-side GET /api/receipts/{receipt_id}/public with signature and trust fields.",
    availability: "available_now",
  },
  {
    id: "privacy-callbacks",
    label: "Privacy-preserving partner callbacks",
    detail: "Frozen callback query parameters contain no PII — partners verify receipts, not URLs alone.",
    availability: "available_now",
  },
  {
    id: "sandbox-design-partner",
    label: "Sandbox design-partner integration",
    detail: "Manual review, operator-provisioned sandbox policies, callback allowlists, and conformance tooling.",
    availability: "available_now",
  },
];

export const PARTNER_ONBOARDING_IN_DEVELOPMENT: PartnerCapabilityItem[] = [
  {
    id: "passwordless-account",
    label: "Consented passwordless partner-account creation",
    detail: "Create or recover a partner-local account from an Abraxas verification — not deployed yet.",
    availability: "in_development",
  },
  {
    id: "pairwise-identity",
    label: "Pairwise partner identity",
    detail: "Per-partner subject identifiers so partners cannot correlate users across services.",
    availability: "in_development",
  },
  {
    id: "optional-email",
    label: "Optional email sharing",
    detail: "Separate consent scope for contact information — never bundled with eligibility verification.",
    availability: "in_development",
  },
  {
    id: "newsletter-consent",
    label: "Separate newsletter / marketing consent",
    detail: "Marketing enrollment is optional and independently consented — never preselected.",
    availability: "in_development",
  },
  {
    id: "continue-with-abraxas-login",
    label: "Returning “Continue with Abraxas” login",
    detail: "Faster return visits using verified Passport context — partner sessions remain partner-owned.",
    availability: "in_development",
  },
  {
    id: "partner-sessions-benefits",
    label: "Partner-owned sessions and benefits",
    detail: "Partners issue their own sessions, preferences, purchases, rewards, and communications.",
    availability: "in_development",
  },
];

export const PARTNER_ONBOARDING_PRIVACY_PRINCIPLES = [
  "Partners receive only the claims and information the user explicitly authorizes.",
  "Abraxas does not send ID photos or date of birth to partners.",
  "Eligibility verification is separate from marketing consent.",
  "Newsletter enrollment must be optional and separately consented.",
  "Each partner owns its local accounts, sessions, preferences, purchases, rewards, and communications.",
  "Abraxas must not silently enroll users in third-party services.",
  "Future partner identity must be pairwise so partners cannot correlate users across services.",
] as const;

export const PARTNER_ONBOARDING_HOW_IT_WORKS = [
  {
    step: 1,
    title: "User selects Continue with Abraxas Passport",
    body: "The partner starts Partner Flow with an allowlisted return_url — available today.",
  },
  {
    step: 2,
    title: "User creates or opens their Passport",
    body: "zkLogin sign-in and optional identity steps when the policy requires them.",
  },
  {
    step: 3,
    title: "Abraxas evaluates the partner’s eligibility policy",
    body: "Policy engine returns approved, denied, or manual_review against required claims.",
  },
  {
    step: 4,
    title: "User reviews and approves the requested information and actions",
    body: "Today: Partner Flow consent for verification. Future: separate scopes for account, email, and marketing.",
  },
  {
    step: 5,
    title: "Partner validates the signed result server-side",
    body: "Fetch and validate GET /api/receipts/{receipt_id}/public before granting access.",
  },
  {
    step: 6,
    title: "Partner creates or finds its local account and issues its own session",
    body: "Planned: consented passwordless account bootstrap from verification — partners own sessions today.",
  },
  {
    step: 7,
    title: "Optional perks or communications are enabled only from independent consent choices",
    body: "Planned: email and newsletter scopes are separate from eligibility verification.",
  },
] as const;

/** Consent mockup labels — illustrative only; not wired to live enrollment. */
export const PARTNER_CONSENT_MOCKUP_CONTROLS = [
  { id: "verify-eligibility", label: "Verify my eligibility", defaultChecked: true, disabled: true },
  { id: "partner-account", label: "Create or sign in to my partner account", defaultChecked: false, disabled: true },
  { id: "share-email", label: "Share my email with this partner", defaultChecked: false, disabled: true },
  { id: "newsletter", label: "Subscribe me to this partner’s newsletter", defaultChecked: false, disabled: true },
] as const;

export const PARTNER_CONSENT_MOCKUP_NOTE =
  "Illustrative consent layout only — not a live enrollment form. Newsletter is never preselected.";

export const PARTNER_ONBOARDING_DOC_LINKS = {
  partnerFlow: "/docs/partner-flow",
  designPartner: "/design-partner",
  integrations: "/integrations",
  integrationsApply: "/integrations#apply",
  developersPartner: "/developers/partner",
  passwordlessPlan: "/docs/partner-flow#planned-passwordless-onboarding",
  goodTroublePilot: "/good-trouble",
} as const;

/** Terms that must not appear without an explicit planned/in-development qualifier on marketing surfaces. */
export const PARTNER_ONBOARDING_FALSE_LIVE_CLAIM_PATTERNS = [
  /\baccount bootstrap is live\b/i,
  /\bpasswordless (partner )?account creation is (live|available|deployed)\b/i,
  /\bnewsletter enrollment is live\b/i,
  /\bpartner sso is live\b/i,
  /\bemail sharing is live\b/i,
  /\bpairwise (partner )?identity is (live|deployed)\b/i,
  /\bself-serve partner account\b/i,
  /\bautomatic(ally)? (creates?|provision) (a )?partner account\b/i,
] as const;

export const PARTNER_ONBOARDING_AVAILABILITY_LABEL: Record<PartnerCapabilityAvailability, string> = {
  available_now: "Available now",
  in_development: "In development",
  planned: "Planned",
};

export function scanForFalseLiveOnboardingClaims(text: string): string[] {
  return PARTNER_ONBOARDING_FALSE_LIVE_CLAIM_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
