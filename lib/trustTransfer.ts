// FILE: lib/trustTransfer.ts

export const INTEGRATE_COUNTERPARTY_TRUST = {
  title: "Why counterparties trust it",
  headline:
    "Counterparties verify credentials cryptographically — they don't rely on Abraxas reputation. Verify once means reuse while valid, not trust forever.",
  body: "Credentials are cryptographically signed and independently verifiable — counterparties verify the proof, not Abraxas reputation.",
  bullets: [
    "W3C Verifiable Credentials — checkable signatures, no Abraxas call required",
    "Verify API for relying parties at transaction time",
    "Material changes (ownership, liens, appraisal, identity expiry) trigger refresh or revocation",
    "Consent + selective disclosure — holder approves each share",
    "Fail-closed on revoke or expiry",
  ],
} as const;
