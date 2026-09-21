export function chainAttestationServerExample(): string {
  return `import { AbraxasPartnerKit } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function issueOnchainGate(receiptId: string) {
  const res = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/chain-attestations", {
    method: "POST",
    headers: {
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      receipt_id: receiptId,
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      chain_id: 11155111,
      verifying_contract: process.env.PARTNER_VERIFIER_ADDRESS,
    }),
  });
  const issued = await res.json();
  if (!issued.allowed) return issued;
  // Pass typed_data + signature to YOUR verifier contract.
  // A valid attestation is not a payment, transfer, trade, token approval, or transaction.
  return issued;
}
`;
}

export function solanaOnchainEligibilityGateExample(): string {
  return `import { AbraxasPartnerKit } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function issueSolanaOnchainGate(receiptId: string) {
  const res = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/chain-attestations", {
    method: "POST",
    headers: {
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      receipt_id: receiptId,
      action_type: "partner_protocol_action",
      action_scope: "sandbox:partner_protocol",
      network_id: "solana_devnet",
      wallet_binding_mode: "required",
    }),
  });
  const issued = await res.json();
  if (!issued.allowed) return issued;
  // YOUR transaction: Ed25519 verify instruction immediately before gate authorize.
  // Then YOUR program consumes the PDA once. Abraxas does not submit the transaction.
  // A valid authorization is not a payment, transfer, trade, or token mint.
  return issued;
}
`;
}

export const CHAIN_ATTESTATION_ARCHITECTURE = `
holder -> private Partner Flow proof
Abraxas -> current public receipt
partner backend -> POST /api/v1/chain-attestations (API key)
Abraxas -> EIP-712 or Solana eligibility attestation (hashes only)
partner verifier contract/program -> trusted signer, domain, expiry, nonce, bindings
partner code -> decides what action to allow
Abraxas never deploys a shared execution contract and never submits a transaction
`.trim();
