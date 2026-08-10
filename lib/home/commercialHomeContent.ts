// FILE: lib/home/commercialHomeContent.ts
// Homepage narrative copy aligned with the Abraxas commercial one-pager.

export const HOME_PROBLEM_HEADLINE = "Why now?";

export const HOME_PROBLEM_BODY =
  "Regulated platforms repeatedly collect IDs, dates of birth, addresses, and other sensitive information to answer similar eligibility questions. Users experience friction, while businesses inherit additional sensitive-data risk.";

export const HOME_HOW_IT_WORKS_HEADLINE = "How it works";

export const HOME_HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Verify",
    summary: "The user completes identity verification.",
  },
  {
    step: 2,
    title: "Receive a Passport",
    summary: "Verified credentials are associated with the user's Abraxas Passport.",
  },
  {
    step: 3,
    title: "Evaluate a policy",
    summary: "An approved partner asks a specific eligibility question.",
  },
  {
    step: 4,
    title: "Return a signed outcome",
    summary:
      "The partner receives a verifiable answer rather than the user's complete identity file.",
  },
] as const;

export const HOME_PARTNER_RECEIVES_HEADLINE = "What the partner receives";

export const HOME_PARTNER_RECEIVES_LEAD =
  "Abraxas is designed to return the eligibility outcome and verification metadata required for the decision—via server-side receipt validation—rather than automatically sharing the user's complete identity record.";

export const HOME_PARTNER_RECEIVES_NOTE =
  "Callback redirects and webhooks carry identifiers and notifications. Cryptographic proof and live validity require fetching the public receipt (for example, GET /api/receipts/{receiptId}/public).";

export const PARTNER_RECEIVES_ITEMS = [
  "Policy-scoped eligibility outcome (approved, denied, or manual review)",
  "Policy, decision, and receipt identifiers",
  "Issuance and expiration timestamps",
  "Signed receipt verification material (via public receipt fetch)",
  "Live validity and revocation status (via receipt re-fetch)",
] as const;

export const PARTNER_DOES_NOT_RECEIVE_ITEMS = [
  "Complete ID document images",
  "Full date of birth (derived booleans like over-21 may apply where configured)",
  "Raw biometric capture (selfie or video)",
  "Full identity profile (legal name, address, document number)",
  "Wallet address or transaction history",
  "Information outside the evaluated policy scope",
] as const;

export const HOME_ALREADY_BUILT_HEADLINE = "Already built";

export const HOME_ALREADY_BUILT_LEAD =
  "Production-capable components available today—described accurately, without adoption or audit claims.";

export const ALREADY_BUILT_CAPABILITIES = [
  "Identity onboarding and authentication",
  "Document and biometric verification support",
  "Reusable Passport credentials",
  "Partner-defined eligibility policies",
  "Signed verification receipts",
  "Independent receipt validation",
  "Scoped partner API access",
  "Metering and commercial entitlements",
  "Revocation and lifecycle controls",
  "Durable webhook delivery and operational monitoring",
] as const;

export const HOME_PARTNER_INTEGRATION_HEADLINE = "Partner integration";

export const HOME_PARTNER_INTEGRATION_LEAD =
  "Approved partners integrate eligibility checks through scoped APIs, signed receipts, and documented partner flows.";

export const HOME_FINAL_CTA_HEADLINE =
  "Build eligibility into your product without building another identity warehouse.";
