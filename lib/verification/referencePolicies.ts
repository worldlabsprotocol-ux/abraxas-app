// FILE: lib/verification/referencePolicies.ts
// Public reference policies for demos and partner onboarding.

export const REFERENCE_POLICIES = {
  verifiedParticipant: {
    id: "abraxas-verified-participant-v1",
    name: "Abraxas Verified Participant v1",
    description: "Minimum gate for verified asset submission and permissioned partner actions.",
    action: "submit_asset" as const,
    required: [
      "Identity credential active (L2+)",
      "Liveness passed",
      "Wallet binding fresh (≤30 days)",
    ],
    optionalPilot: [
      "Sanctions screening clear (partner-gated — manual review when pending)",
    ],
    outcomes: ["approved", "denied", "manual_review"] as const,
  },
  verifiedBooking: {
    id: "abraxas-booking-v1",
    name: "Verified stay / booking",
    action: "book_asset" as const,
    required: ["Identity verified", "Liveness", "Wallet binding"],
  },
  coreBrowse: {
    id: "abraxas-core-v1",
    name: "Passport Core — browse",
    action: "browse" as const,
    required: ["No deep verification required"],
  },
} as const;

export type ReferencePolicyKey = keyof typeof REFERENCE_POLICIES;
