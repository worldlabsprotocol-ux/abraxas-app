// FILE: lib/partner/tradingVenue/examples.ts
// Copy paste venue preflight. Server side only. No trades.

export function tradingVenueServerPreflightExample(): string {
  return `import { AbraxasTradingVenueAdapter } from "@/lib/partner/tradingVenue";

const adapter = new AbraxasTradingVenueAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export function startVenueCheck(returnUrl: string) {
  return adapter.startPolicyVerification(returnUrl);
}

export async function enableMarketAccess(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "enable_market_access",
    action_scope: "sandbox:market_access",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  // Client JSON is allow/deny, reason, action binding, and expiry only.
  return adapter.preflight({ result: verified, contract });
}
`;
}

export const TRADING_VENUE_ARCHITECTURE_DIAGRAM = `
holder -> Abraxas hosted /partner/verify
Abraxas -> signed eligibility receipt
venue server -> GET /api/receipts/{id}/public
venue server -> AbraxasPartnerKit.evaluateFetchedReceipt
venue adapter -> issue action contract (type, scope, expiry, nonce)
venue adapter -> preflight enable_market_access
lifecycle / webhook -> re-fetch public receipt, never grant from the event body
browser <- { allowed, reason, action_binding, expires_at }
`.trim();
