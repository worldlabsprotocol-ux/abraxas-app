// FILE: lib/passport/passportStepCopy.ts
// One sentence per step — no jargon in primary UI.

export const PASSPORT_STEPS = {
  create: {
    title: "Create Passport",
    purpose: "This is your private place to manage proof — not a document upload folder.",
  },
  verifyIdentity: {
    title: "Verify identity",
    purpose: "Confirm it's you once. Partners get yes or no — not your ID photos.",
  },
  addWallet: {
    title: "Add wallet",
    purpose: "Prove this wallet belongs to you. No funds move.",
  },
  chooseShare: {
    title: "Choose what to share",
    purpose: "This partner only gets the proof it needs to decide access.",
  },
  accessGranted: {
    title: "Access granted",
    purpose: "You're in. You can revoke access anytime from Passport.",
  },
} as const;
