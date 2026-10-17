// FILE: lib/home/homepageHowCopy.ts
// Consolidated "How Abraxas works" stage labels (homepage only).

export const HOMEPAGE_HOW_HEADING = "How Abraxas works";

export const HOMEPAGE_HOW_LEAD =
  "Explore each stage — request, evaluation, signed decision, and independent verification.";

export const HOMEPAGE_HOW_STAGES = [
  { id: "issuer", label: "Request verification", short: "Scoped policy ask" },
  { id: "policy", label: "Evaluate evidence", short: "Authorized inputs only" },
  { id: "decision", label: "Issue signed decision", short: "Cryptographic payload" },
  { id: "verifier", label: "Verify independently", short: "Offline trust check" },
] as const;
