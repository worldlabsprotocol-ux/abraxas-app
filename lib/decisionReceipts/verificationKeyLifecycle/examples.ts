// FILE: lib/decisionReceipts/verificationKeyLifecycle/examples.ts

export function receiptVerificationKeyExample(): string {
  return `// Backend first. Re-fetch the current receipt. Honor currently_valid and revocation.
const keys = await fetch("https://abraxasworld.xyz/api/receipts/verification-keys");
const document = await keys.json();
// document.keys[].public_jwk is Ed25519 OKP { kty, crv, x } only.
// Never send signing_key_id, private keys, or environment overrides to Abraxas.

const receipt = await fetch("https://abraxasworld.xyz/api/receipts/" + receiptId + "/public");
const view = await receipt.json();
if (view.signature_valid !== true || view.currently_valid !== true) {
  return { allowed: false };
}
`;
}

export const RECEIPT_KEY_LIFECYCLE_ARCHITECTURE = `
env ABRAXAS_SIGNING_KEY (private, environment-only)
env ABRAXAS_PUBLIC_KEY + ABRAXAS_SIGNING_KEY_ID
optional ABRAXAS_RECEIPT_VERIFICATION_REGISTRY (public lifecycle entries)
  -> issue only with active in-window key for this runtime
  -> verify receipt.signing_key_id through the registry
  -> GET /api/receipts/verification-keys (public-safe document)
partners re-fetch public receipt; signature is not a grant
`.trim();
