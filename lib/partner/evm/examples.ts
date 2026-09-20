// FILE: lib/partner/evm/examples.ts
// Copy paste EVM preflight. Server side only. Partner execution stays in the partner backend.

export function evmPartnerServerExample(): string {
  return `import { AbraxasEvmPartnerAdapter } from "@/lib/partner/evm";

const adapter = new AbraxasEvmPartnerAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function enableProtocolAccess(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "enable_protocol_access",
    action_scope: "sandbox:protocol_access",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await adapter.verifySignedReceipt(receiptId);
  // Client JSON is allow/deny, reason, action binding, and expiry only.
  // Allowed is never a transaction, signature, gas grant, or execution.
  const preflight = await adapter.preflight({ result: verified, contract });
  if (!preflight.allowed) return preflight;

  // PARTNER EXECUTION BELONGS HERE, IN YOUR BACKEND.
  // Use your own RPC, signer, contract, gas, and transaction construction.
  // Do not send chain IDs, calldata, wallets, or transaction payloads to Abraxas.
  return preflight;
}
`;
}

export const EVM_PARTNER_ARCHITECTURE_DIAGRAM = `
holder -> Abraxas hosted /partner/verify
Abraxas -> signed eligibility receipt
partner server -> GET /api/receipts/{id}/public
partner server -> AbraxasPartnerKit.evaluateFetchedReceipt
EVM adapter -> issue action contract (type, narrow scope, expiry, nonce)
EVM adapter -> preflight enable_protocol_access | enable_member_access | enable_redemption_access
partner backend -> its own RPC, signer, contract, gas, and execution
lifecycle / webhook -> re-fetch public receipt, never grant from the event body
browser <- { allowed, reason, action_binding, expires_at }
`.trim();
