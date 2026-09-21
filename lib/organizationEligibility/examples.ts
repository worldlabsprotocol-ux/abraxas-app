export function organizationEligibilityServerExample(): string {
  return `import { AbraxasPartnerKit } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID,
  policyId: process.env.ABRAXAS_POLICY_ID,
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION),
  requirePolicyVersion: true,
  environment: "sandbox",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function requestInstitutionalEligibilityGate(nonce) {
  const consent = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/organization-eligibility/consent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
    },
    body: JSON.stringify({
      result_category: "authorized_signer",
      purpose: "Confirm one named protocol action",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    }),
  }).then((res) => res.json());

  const issued = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/organization-eligibility/issue", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
    },
    body: JSON.stringify({ consent_ref: consent.consent_ref }),
  }).then((res) => res.json());

  // issued.result is authorized_signer: approved | denied | expired | revoked.
  // Re-fetch the current public receipt before any grant. This is not KYB evidence.
  const receipt = await kit.fetchPublicReceipt(process.env.ABRAXAS_RECEIPT_ID);
  if (!receipt.ok) return { allowed: false };
  return { ...issued, presentation_sufficient: false, utila_integration: false };
}

export async function issueInstitutionalChainAttestation(receiptId) {
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
    }),
  });
  return res.json();
}
`;
}
