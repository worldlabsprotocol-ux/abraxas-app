// FILE: lib/trustTransfer.ts
// Trust transfer. cryptographic proof others verify independently (not reputation).

export const TRUST_TRANSFER_HEADLINE =
  "One check. Portable proof. Others can trust it without doing the work again.";

export const TRUST_TRANSFER_SUBLINE =
  "Your verification becomes proof others can check. Not reputation. Not blind faith.";

export const TRUST_TRANSFER_ANSWER =
  "Signed credentials plus optional Sui anchor. Partners check the proof. They do not need your documents again.";

export const COUNTERPARTY_TRUST_BLURB =
  "Partners do not re-verify. They check the proof.";

export const VERIFICATION_CHAIN_STEPS = [
  {
    step: "01",
    title: "Verify once",
    body: "Licensed IDV or attested asset scope. outcome only, never raw document storage for partners.",
  },
  {
    step: "02",
    title: "Issue credential",
    body: "W3C Verifiable Credential v2.0, cryptographically signed by Abraxas.",
  },
  {
    step: "03",
    title: "Anchor (optional)",
    body: "Sui Move Passport stamp. portable on-chain verification state.",
  },
  {
    step: "04",
    title: "Anyone verifies",
    body: "Lenders, marketplaces, and ATSs call verify API or check signature. no trust in you required.",
  },
] as const;

export const HOW_OTHERS_VERIFY_POINTS = [
  "W3C Verifiable Credential. independently checkable signature",
  "POST /api/credentials/verify. relying party JWT verify",
  "GET /api/sui/passport. on-chain stamp read",
  "Policy engine returns approved / denied. no document resend",
] as const;

export const INTEGRATE_COUNTERPARTY_TRUST = {
  title: "Why counterparties trust it",
  body: "Because the credential is cryptographically signed and independently verifiable. not because they trust Abraxas or the original verifier. They verify the math, not your reputation.",
  bullets: [
    "Ed25519-signed W3C credentials. tamper-evident",
    "Relying parties never receive raw KYC documents by default",
    "Consent + selective disclosure. holder approves each share",
    "Audit references. decision ID, not email attachments",
  ],
} as const;

export const CINEMATIC_TRUST_TRANSFER_LINE =
  "Counterparty verifies the proof. not your documents.";
