export function evmOnchainEligibilityGateExample(): string {
  return `import { AbraxasPartnerKit } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function issueEvmOnchainGate(receiptId: string) {
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
      deployment_ref: process.env.ABRAXAS_GATE_DEPLOYMENT_REF,
      organization_binding_hash: process.env.ABRAXAS_ORGANIZATION_BINDING_HASH,
    }),
  });
  const issued = await res.json();
  if (!issued.allowed) return issued;
  // Encode consumeEligibility on YOUR gate. Owner-only addTrustedSigner / retireTrustedSigner / revokeTrustedSigner.
  // Abraxas never broadcasts the signer-update transaction.
  return issued;
}
`;
}

export const EVM_GATE_LOCAL_COMMANDS = `
cd contracts/evm-eligibility-verifier
forge test -vv
# Human-only local Anvil deploy (operator supplies RPC and key; never commit them):
# forge script script/DeployPartnerGate.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
`.trim();
