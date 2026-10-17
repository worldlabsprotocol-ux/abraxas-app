// FILE: lib/home/homepageHowCopy.ts
// Consolidated "How Abraxas works" stage labels (homepage only).

export const HOMEPAGE_HOW_HEADING = "How it works";

export const HOMEPAGE_HOW_LEAD =
  "Tap each step to see how a question becomes a signed answer your app can check on its own.";

export const HOMEPAGE_HOW_STAGES = [
  { id: "issuer", label: "Request verification", short: "Scoped policy ask" },
  { id: "policy", label: "Evaluate evidence", short: "Authorized inputs only" },
  { id: "decision", label: "Issue signed decision", short: "Cryptographic payload" },
  { id: "verifier", label: "Verify independently", short: "Offline trust check" },
] as const;
