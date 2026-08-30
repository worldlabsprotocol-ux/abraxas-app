// FILE: lib/activation/activationCopy.ts
// Phase 6 activation copy — factual beta-stage strings for homepage surfaces.

export const ACTIVATION_EYEBROW = "Public beta · design partners";

export const ACTIVATION_HEADLINE = "One verification. Faster onboarding. Fewer forms.";

export const ACTIVATION_SUBHEAD =
  "Abraxas helps users prove eligibility and securely continue into partner experiences without repeatedly exposing sensitive identity information. Partners verify signed policy results server-side via Partner Flow today.";

export const ACTIVATION_AVAILABILITY =
  "Passport sign-in and Partner Flow are in public beta. Sandbox policies are operator-provisioned after design-partner review. Consented passwordless partner accounts, email sharing, and newsletter enrollment are in development — not live.";

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
  body: "Redirect holders to Abraxas Passport, verify the signed receipt on your server, and gate access on policy outcomes. Consented partner-account bootstrap and optional email/newsletter scopes are in development.",
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
