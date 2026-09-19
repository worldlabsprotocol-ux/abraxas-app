// FILE: lib/partner/paymentAuthorization/examples.ts
// Copy paste payment preflight. Server side only. No charges.

export function paymentAuthorizationServerExample(): string {
  return `import { AbraxasPaymentAuthorizationAdapter } from "@/lib/partner/paymentAuthorization";

const adapter = new AbraxasPaymentAuthorizationAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export function startPaymentCheck(returnUrl: string) {
  return adapter.startPolicyVerification(returnUrl);
}

export async function authorizeCheckout(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "authorize_checkout",
    action_scope: "sandbox:checkout",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  // Client JSON is allow/deny, reason, payment action binding, and expiry only.
  return await adapter.preflight({ result: verified, contract });
}

export async function authorizeRecurring(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "authorize_recurring_payment",
    action_scope: "sandbox:recurring_payment",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  return await adapter.preflight({ result: verified, contract });
}
`;
}

export const PAYMENT_AUTHORIZATION_ARCHITECTURE_DIAGRAM = `
holder -> Abraxas hosted /partner/verify
Abraxas -> signed eligibility receipt
merchant server -> GET /api/receipts/{id}/public
merchant server -> AbraxasPartnerKit.evaluateFetchedReceipt
payment adapter -> issue action contract (type, scope, expiry, nonce)
payment adapter -> preflight authorize_checkout or authorize_recurring_payment
merchant -> its own checkout or billing flow
lifecycle / webhook -> re-fetch public receipt, never grant from the event body
browser <- { allowed, reason, payment_action_binding, expires_at }
`.trim();
