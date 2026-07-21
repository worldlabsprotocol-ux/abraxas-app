// FILE: lib/trustTransfer.ts
// Trust transfer — cryptographic proof others verify independently (not reputation).

export const TRUST_TRANSFER_HEADLINE =
  "One verification. Cryptographically portable. Others can trust it without re-doing the work.";

export const TRUST_TRANSFER_SUBLINE =
  "Your verification becomes trust that counterparties can verify themselves — not reputation, not blind faith.";

export const TRUST_TRANSFER_ANSWER =
  "W3C Verifiable Credentials + Ed25519 signatures. Relying parties verify the proof cryptographically via Abraxas or on-chain — they never need to re-collect your documents.";

export const COUNTERPARTY_TRUST_BLURB =
  "Counterparties don't need to re-verify. They verify the credential.";

export const VERIFICATION_CHAIN_STEPS = [
  {
    step: "01",
    title: "Verify once",
    body: "Licensed IDV or attested asset scope — outcome only, never raw document storage for partners.",
  },
  {
    step: "02",
    title: "Issue credential",
    body: "W3C Verifiable Credential v2.0, cryptographically signed by Abraxas.",
  },
  {
    step: "03",
    title: "Anchor (optional)",
    body: "Sui Move Passport stamp — portable on-chain verification state.",
  },
  {
    step: "04",
    title: "Anyone verifies",
    body: "Lenders, marketplaces, and ATSs call verify API or check signature — no trust in you required.",
  },
] as const;

export const HOW_OTHERS_VERIFY_POINTS = [
  "W3C Verifiable Credential — independently checkable signature",
  "POST /api/credentials/verify — relying party JWT verify",
  "GET /api/sui/passport — on-chain stamp read",
  "Policy engine returns approved / denied — no document resend",
] as const;

export const INTEGRATE_COUNTERPARTY_TRUST = {
  title: "Why counterparties trust it",
  body: "Because the credential is cryptographically signed and independently verifiable — not because they trust Abraxas or the original verifier. They verify the math, not your reputation.",
  bullets: [
    "Ed25519-signed W3C credentials — tamper-evident",
    "Relying parties never receive raw KYC documents by default",
    "Consent + selective disclosure — holder approves each share",
    "Audit references — decision ID, not email attachments",
  ],
} as const;

export const CINEMATIC_TRUST_TRANSFER_LINE =
  "Counterparty verifies the proof — not your documents.";
