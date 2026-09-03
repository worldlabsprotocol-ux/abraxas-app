// FILE: lib/home/assuranceNetworkCopy.ts
// Homepage assurance network narrative — carefully qualified product positioning.

export const ASSURANCE_NETWORK_EYEBROW = "Privacy-preserving assurance";

export const ASSURANCE_NETWORK_HEADLINE = "Prove eligibility once. Share only what matters.";

export const ASSURANCE_NETWORK_SUBHEAD =
  "Abraxas is designed to help people reuse trusted eligibility proofs across participating services—without repeatedly sharing an ID, date of birth, or unnecessary personal information.";

export const ASSURANCE_NETWORK_DIRECTION =
  "A privacy-preserving assurance network that lets people prove eligibility once and present policy-specific proof wherever it is accepted.";

export const ASSURANCE_NETWORK_STEPS = [
  {
    id: "verify-once",
    title: "Verify once",
    body: "Complete the appropriate assurance process for the requested use case — from self-attestation to authoritative document validation.",
  },
  {
    id: "carry-credential",
    title: "Carry a reusable credential",
    body: "Abraxas associates the resulting eligibility claim with your authenticated account for later partner evaluations.",
  },
  {
    id: "present-proof",
    title: "Present private proof",
    body: "Participating services receive a policy-specific cryptographic result instead of underlying identity documents.",
  },
] as const;

export const ASSURANCE_NETWORK_TRANSACTION_EYEBROW = "Transaction obligations";

export const ASSURANCE_NETWORK_TRANSACTION_HEADLINE =
  "Evidence quality and transaction requirements are separate";

export const ASSURANCE_NETWORK_TRANSACTION_SUBHEAD =
  "A person may hold AGE_VERIFIED assurance while a partner policy still requires a transaction-time ID check. Transaction obligations never raise or substitute for credential assurance.";

export const ASSURANCE_NETWORK_TRUST_POINTS = [
  "The merchant receives the answer — not the underlying identity document.",
  "A credential can be reused, but every transaction receives a newly evaluated, partner-bound receipt.",
  "Higher-risk actions can require stronger or renewed verification.",
  "Partner policy determines what proof is acceptable — authentication begins the journey; authoritative evidence establishes eligibility.",
  "Transaction-time ID requirements are policy obligations — not stronger identity evidence.",
] as const;

export const ASSURANCE_NETWORK_USE_CASES = [
  {
    id: "age-gated-commerce",
    title: "Age-gated commerce",
    body: "Designed to support online eligibility checks with policy-defined assurance levels.",
  },
  {
    id: "regulated-retail",
    title: "Regulated retail pre-verification",
    body: "Can reduce repeated data entry and prepare a customer for the transaction while preserving any legally required merchant-side ID check.",
  },
  {
    id: "event-entry",
    title: "Event and venue entry",
    body: "Configurable entry policies with optional on-site ID reinforcement where risk requires it.",
  },
  {
    id: "account-humanity",
    title: "Account humanity assurance",
    body: "Humanity and abuse-resistance signals — separate from government ID age proof.",
  },
  {
    id: "reusable-eligibility",
    title: "Reusable customer eligibility",
    body: "Carry eligibility across participating partners with fresh receipts per transaction.",
  },
  {
    id: "compliance-workflows",
    title: "Partner compliance workflows",
    body: "Server-side policy evaluation with signed receipts partners can verify independently.",
  },
] as const;

export const ASSURANCE_NETWORK_DISCLAIMER =
  "Abraxas does not replace legally required physical, point-of-sale, pickup, or delivery ID checks. Google sign-in and zkLogin establish account authentication — not a person's age. Example policies shown for architecture illustration are not legal approval or production certification.";

export const ASSURANCE_NETWORK_FORBIDDEN_CLAIMS = [
  "zklogin verifies age",
  "legally approved",
  "eliminates id checks",
  "production age verification",
  "regulatory approval",
  "fraud elimination",
  "military-grade",
] as const;
