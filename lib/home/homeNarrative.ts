// FILE: lib/home/homeNarrative.ts
// Homepage narrative copy — each section answers a different question.

/** Protocol flow — "How does it work?" */
export const HOME_PROTOCOL_STEPS = [
  { step: 1, label: "Verify your identity once", detail: "Complete verification on Abraxas Passport" },
  { step: 2, label: "Receive an Abraxas Passport", detail: "Portable credentials bound to your identity" },
  { step: 3, label: "Partners request only the claims they need", detail: "Selective disclosure — no document re-upload" },
  { step: 4, label: "The Trust Engine evaluates policy", detail: "Claims checked against partner requirements" },
  { step: 5, label: "A signed Trust Decision is returned", detail: "Cryptographic proof partners can verify server-side" },
] as const;

/** Public milestones — no internal engineering jargon */
export const HOME_CURRENT_MILESTONES = [
  "Complete production validation with enterprise partners.",
  "Finalize the stable protocol specification for partner integrations.",
  "Release Abraxas v1.0 Beta and begin enterprise hardening.",
] as const;
