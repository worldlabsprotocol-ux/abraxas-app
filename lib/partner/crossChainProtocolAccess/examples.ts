// FILE: lib/partner/crossChainProtocolAccess/examples.ts

export function crossChainProtocolAccessServerExample(): string {
  return `import { AbraxasPartnerKit } from "@abraxas/partner-kit";
import { issueCrossChainProtocolAccess } from "@abraxas/partner-kit/cross-chain-protocol-access";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID,
  policyId: process.env.ABRAXAS_POLICY_ID,
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION),
  requirePolicyVersion: true,
  environment: "sandbox",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function activateProtocolAccessOnServer(input) {
  // Browser cannot select chain, contract/program, receipt, policy, action, signer, nonce, expiry, or entitlement.
  return issueCrossChainProtocolAccess({
    kit,
    request_ref: input.request_ref,
    verifier_nonce: input.verifier_nonce,
    network_id: process.env.ABRAXAS_PROTOCOL_NETWORK_ID,
    deployment_ref: process.env.ABRAXAS_VERIFIED_DEPLOYMENT_REF,
  });
}
`;
}

export function crossChainProtocolAccessHttpsExample(): string {
  return `Local/sandbox only.

1. POST /api/v1/eligibility-presentations/requests with policy, purpose, action, environment, verifier_nonce.
2. Redirect the holder to hosted_verify_url (Hosted Partner Flow + fresh consent).
3. POST /api/v1/eligibility-presentations/issue with only request_ref and verifier_nonce.
4. POST /api/v1/eligibility-presentations/verify, then GET /api/receipts/{id}/public.
5. Issue a chain attestation with server-owned deployment_ref. Named action: activate_protocol_access.
6. EVM: call AbraxasProtocolAccess.activateProtocolAccess after the gate consumes the EIP-712 attestation once.
7. Solana: Ed25519 verify ix, gate Authorization PDA, then activate_protocol_access once.

A presentation is never sufficient. No live Arc, EVM, Solana devnet, Mainnet, USDC, Utila, or partner deployment.
`;
}
