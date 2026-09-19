// FILE: lib/partner/solana/examples.ts
// Copy paste Solana partner verification. Server side only.

export function solanaServerVerifyExample(): string {
  return `import { AbraxasSolanaPartnerAdapter } from "@/lib/partner/solana";

const adapter = new AbraxasSolanaPartnerAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export function startGate(returnUrl: string) {
  return adapter.startPolicyVerification(returnUrl);
}

export async function claimAccess(receiptId: string) {
  const verified = await adapter.verifySignedReceipt(receiptId);
  // Client JSON is allow/deny + reason only. Do not log the receipt.
  return adapter.bindPartnerAction(verified, "claim_access");
}
`;
}

export const SOLANA_ARCHITECTURE_DIAGRAM = `
holder -> Abraxas hosted /partner/verify
Abraxas -> signed eligibility receipt
partner server -> GET /api/receipts/{id}/public
partner server -> AbraxasPartnerKit.evaluateFetchedReceipt
Solana adapter -> bind claim_access or continue_checkout
browser <- { allowed, reason, action }
`.trim();
