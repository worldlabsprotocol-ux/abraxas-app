// FILE: lib/partner/tradingVenue/profiles/examples.ts

export function tradingVenueProfileExample(profileId = "generic_trading_venue"): string {
  return `import { AbraxasTradingVenueAdapter } from "@/lib/partner/tradingVenue";

// venueProfileId comes from server sandbox configuration, never from the browser.
const adapter = new AbraxasTradingVenueAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
  venueProfileId: ${JSON.stringify(profileId)},
});

export async function enableMarketAccess(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "enable_market_access",
    action_scope: "sandbox:market_access",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  return adapter.preflight({ result: verified, contract });
}
`;
}

export const VENUE_PROFILE_ARCHITECTURE = `
server sandbox config -> venueProfileId (generic_trading_venue | hyperliquid_trading_venue)
venue server -> issue enable_market_access contract
venue server -> re-fetch current public receipt
venue adapter -> profile + receipt + nonce preflight
browser <- { allowed, reason, action_binding, expires_at }
venue backend keeps accounts, wallets, market data, orders, execution
Universal HTTPS | Next.js | Express | Wix Velo backend | Serverless kits copy this preflight, never execution
`.trim();
