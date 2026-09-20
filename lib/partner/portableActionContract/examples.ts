// FILE: lib/partner/portableActionContract/examples.ts

export function portableActionServerExample(): string {
  return `import { AbraxasPortableActionAdapter } from "@/lib/partner/portableActionContract";

const adapter = new AbraxasPortableActionAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function grantMembership(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "grant_membership_access",
    action_scope: "sandbox:membership_access",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  // allowed means your app may grant membership. Abraxas never grants it.
  return adapter.preflight({ result: verified, contract });
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
  return adapter.preflight({ result: verified, contract });
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
  return adapter.preflight({ result: verified, contract });
}

export async function partnerProtocolAction(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "partner_protocol_action",
    action_scope: "sandbox:partner_protocol",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  return adapter.preflight({ result: verified, contract });
}
`;
}

export const PORTABLE_ACTION_ARCHITECTURE_DIAGRAM = `
holder -> Abraxas hosted /partner/verify
Abraxas -> signed eligibility receipt
partner server -> GET /api/receipts/{id}/public
partner server -> AbraxasPartnerKit.evaluateFetchedReceipt
partner server -> issue portable action contract
partner server -> preflight named action + narrow scope
lifecycle / webhook -> re-fetch public receipt; webhook body is never a grant
browser <- { allowed, reason, action_binding, expires_at }
partner system <- performs its own named action if allowed
`.trim();
