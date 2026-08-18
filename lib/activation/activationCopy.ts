// FILE: lib/activation/activationCopy.ts
// Phase 6 activation copy — factual beta-stage strings for homepage surfaces.

export const ACTIVATION_EYEBROW = "Public beta · design partners";

export const ACTIVATION_HEADLINE = "Verify once. Partners get only the policy outcome.";

export const ACTIVATION_SUBHEAD =
  "A holder completes required steps in Abraxas Passport when a policy requires them. An approved partner verifies a signed policy result using the documented Partner Flow receipt contract.";

export const ACTIVATION_AVAILABILITY =
  "Passport sign-in is open in beta. Partner Flow sandbox and production policies are issued manually after review.";

export const POLICY_OUTCOME_STEPS = [
  {
    title: "Holder completes required steps",
    body: "Wallet sign-in and identity steps when the partner policy requires them.",
  },
  {
    title: "Policy evaluates eligibility",
    body: "Abraxas returns approved, denied, or manual_review for the requested policy.",
  },
  {
    title: "Partner verifies the signed result",
    body: 'Example outcome field: "meets age requirement: yes" — verified server-side via the Partner Flow receipt contract.',
  },
] as const;

export const AUDIENCE_HOLDER = {
  title: "I'm a holder",
  body: "Create a Passport, bind a wallet, and complete verification when a partner policy requires it.",
  badge: "Open in beta",
  cta: "Create Passport",
  href: "/passport",
} as const;

export const AUDIENCE_PARTNER = {
  title: "I'm integrating Partner Flow",
  body: "Redirect holders to Abraxas, then verify the signed receipt on your server before granting access. Apply for manual review to receive sandbox provisioning.",
  badge: "Sandbox after review",
  cta: "Apply for review",
  href: "/integrations#apply",
} as const;

export const AUDIENCE_OPERATOR = {
  title: "Provisioning is operator-managed",
  body: "Abraxas operators review applications and issue sandbox or production policies. There is no self-serve production access.",
  badge: "Manual review",
  cta: "Apply for review",
  href: "/integrations#apply",
} as const;

export const METRICS_EYEBROW = "Beta activity";
export const METRICS_HEADING = "Design-partner pilot metrics";
export const METRICS_FOOTNOTE_PREFIX =
  "Internal pilot rollup from Abraxas tables. Not financial reporting.";
export const METRICS_EMPTY =
  "Pilot volume is below our public display threshold. Counters appear here as activity grows.";
export const METRICS_EMPTY_CTA = "Apply as a design partner";
export const METRICS_EMPTY_HREF = "/integrations#apply";
export const METRICS_ERROR = "Pilot metrics are temporarily unavailable.";
export const METRICS_LOADING = "Loading pilot metrics…";

/** Homepage beta overview — customer-facing; no internal engineering or release checklist language. */
export const HOME_BETA_READINESS_EYEBROW = "Public beta";

export const HOME_BETA_READINESS_HEADING = "How Abraxas works in beta";

export const HOME_BETA_READINESS_POINTS = [
  "A holder completes verification once in Abraxas Passport when a partner policy requires it.",
  "A partner receives or verifies only the documented policy outcome — a signed receipt your server checks before granting access.",
  "Partner integration begins with an application and manual review; sandbox access is operator-provisioned after approval.",
] as const;

export const HOME_BETA_READINESS_DISCLAIMER =
  "Beta only. Abraxas does not certify compliance, provide legal advice, guarantee privacy outcomes, promise production availability, scale, or an SLA.";

/** Copy guard — must not appear on Phase 6 activation surfaces. */
export const ACTIVATION_FORBIDDEN_TERMS = [
  "kyc",
  "compliance certified",
  "audited",
  "soc ",
  "iso ",
  "thousands of",
  "n/a",
] as const;
