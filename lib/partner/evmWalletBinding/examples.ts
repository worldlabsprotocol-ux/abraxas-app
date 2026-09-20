// FILE: lib/partner/evmWalletBinding/examples.ts

export function evmWalletBindingExample(): string {
  return `// Backend first. Issue the action contract, then optionally require an EVM message proof.
import { AbraxasEvmPartnerAdapter } from "@/lib/partner/evm";
import { issueEvmWalletChallenge, bindEvmWalletControl } from "@/lib/partner/evmWalletBinding";

const adapter = new AbraxasEvmPartnerAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function requireEvmWalletControl(receiptId: string, origin: string, signature: string) {
  const contract = adapter.issueActionContract({
    action_type: "enable_protocol_access",
    action_scope: "sandbox:protocol_access",
    wallet_binding: "required",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };

  const challenge = await issueEvmWalletChallenge({
    origin,
    partnerId: adapter.kit.options.partnerId,
    policyId: adapter.kit.options.policyId,
    policyVersion: adapter.kit.options.policyVersion ?? 1,
    actionType: contract.action_type,
    actionScope: contract.action_scope,
    networkId: contract.network_context?.network_id ?? "evm_sandbox",
    actionContractNonce: contract.nonce,
  });
  if ("ok" in challenge) return { allowed: false, reason: challenge.status };

  // Holder signs challenge.message with personal_sign only.
  // Copy: "Sign this message to prove control for this one action."
  // Copy: "No transaction will be created or signed."
  // Copy: "Abraxas does not read your balances or hold your keys."

  const bound = await bindEvmWalletControl({
    challengeId: challenge.challenge_id,
    origin,
    partnerId: adapter.kit.options.partnerId,
    policyId: adapter.kit.options.policyId,
    policyVersion: adapter.kit.options.policyVersion ?? 1,
    actionType: contract.action_type,
    actionScope: contract.action_scope,
    networkId: contract.network_context?.network_id ?? "evm_sandbox",
    actionContractNonce: contract.nonce,
    message: challenge.message,
    signature,
  });
  // Store only bound.binding_ref. Never log an address or signature.

  const verified = await adapter.verifySignedReceipt(receiptId);
  return adapter.preflight({
    result: verified,
    contract,
    binding_ref: bound.binding_ref,
  });
}
`;
}

export const EVM_WALLET_BINDING_ARCHITECTURE = `
partner server -> issue EVM action contract (optional or required wallet_binding)
partner server -> issue domain-bound EIP-191 personal_sign challenge
holder -> signs the message only (no transaction, no balances)
partner server -> verify signature, store opaque binding_ref
partner server -> EVM adapter preflight with binding_ref
browser <- { ok, status, binding_ref, expires_at }
`.trim();
