// Build #518 — consistent holder navigation labels (Passport is verification home).

export const HOLDER_NAV = {
  passportHome: { label: "My Passport", short: "Passport" },
  partnerRequests: { label: "Partner requests", short: "Requests" },
  confirmations: { label: "My confirmations", short: "Activity" },
  /** Registry / credential tools — not identity verification. */
  proofsAndRegistry: { label: "Proofs & registry", short: "Proofs" },
  partnerVerifier: { label: "Partner verifier", short: "Verifier" },
  privacy: { label: "Privacy & controls", short: "Privacy" },
  support: { label: "Help & safety", short: "Help" },
} as const;

export const HOLDER_ACTION_LABELS = {
  verifyIdentity: "Verify my identity",
  shareEligibility: "Share an eligibility answer",
  viewStatus: "View verification status",
  viewConfirmations: "View my confirmations",
} as const;

export const PASSPORT_VIEW_HEADINGS = {
  default: {
    eyebrow: "Abraxas Passport",
    headline: "Your verification home",
    subhead:
      "Complete identity and wallet checks once, then approve each partner request without re-uploading documents.",
  },
  requests: {
    eyebrow: "Partner requests",
    headline: "Share an eligibility answer",
    subhead: "Review who is asking, what they need, and approve before Abraxas sends anything.",
  },
  activity: {
    eyebrow: "Confirmations",
    headline: "View my confirmations",
    subhead: "Past eligibility answers you shared — what was checked, who received it, and whether it is still valid.",
  },
  verify: {
    eyebrow: "Passport tools",
    headline: "Proofs, registry, and credentials",
    subhead: "Look up public registry records or validate a credential JWT. Partner receipt testing lives under Verifier.",
  },
} as const;
