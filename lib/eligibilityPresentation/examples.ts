// FILE: lib/eligibilityPresentation/examples.ts

export function eligibilityPresentationServerExample(): string {
  return `import { AbraxasPartnerKit } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID,
  policyId: process.env.ABRAXAS_POLICY_ID,
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION),
  requirePolicyVersion: true,
  environment: "sandbox",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function requestEligibilityPresentation(nonce) {
  const created = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/eligibility-presentations/requests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
    },
    body: JSON.stringify({
      policy_id: process.env.ABRAXAS_POLICY_ID,
      policy_version: Number(process.env.ABRAXAS_POLICY_VERSION),
      purpose: "Confirm one protocol eligibility result",
      action: "retail_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
      result_category: "age_21",
      verifier_nonce: nonce,
    }),
  }).then((res) => res.json());
  return created.hosted_verify_url;
}

export async function issueEligibilityPresentation(requestRef, nonce) {
  const issued = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/eligibility-presentations/issue", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
    },
    body: JSON.stringify({
      request_ref: requestRef,
      verifier_nonce: nonce,
    }),
  }).then((res) => res.json());
  return issued.envelope;
}

export async function verifyEligibilityPresentation(envelope, nonce) {
  const verified = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/eligibility-presentations/verify", {
    method: "POST",
    headers: { "content-type": "application/abraxas-eligibility-presentation+json" },
    body: JSON.stringify({
      envelope,
      expected: {
        verifier_nonce: nonce,
        policy_id: process.env.ABRAXAS_POLICY_ID,
        policy_version: Number(process.env.ABRAXAS_POLICY_VERSION),
        action: "retail_access",
        environment: "sandbox",
      },
    }),
  }).then((res) => res.json());
  if (!verified.ok) return { action: "deny", presentation_sufficient: false };
  const receipt = await kit.fetchPublicReceipt(verified.payload.receipt_verification_ref);
  if (!receipt.ok) return { action: "deny", presentation_sufficient: false };
  const evaluated = kit.evaluateFetchedReceipt(receipt.receipt);
  return { ...evaluated, presentation_sufficient: false };
}
`;
}

export function eligibilityPresentationHttpsExample(): string {
  return `POST /api/v1/eligibility-presentations/requests
Authorization: Bearer YOUR_SANDBOX_API_KEY
Content-Type: application/json

{
  "policy_id": "YOUR_POLICY_ID",
  "policy_version": 1,
  "purpose": "Confirm one protocol eligibility result",
  "action": "retail_access",
  "action_scope": "sandbox:protocol_access",
  "environment": "sandbox",
  "result_category": "age_21",
  "verifier_nonce": "YOUR_ONE_TIME_NONCE"
}

Then redirect the holder to hosted_verify_url.
After Hosted Partner Flow and fresh consent complete, POST only request_ref and verifier_nonce to /api/v1/eligibility-presentations/issue.
Abraxas derives the completed receipt. Do not send receipt_id.
Then POST the envelope to /api/v1/eligibility-presentations/verify
and GET /api/receipts/{id}/public before any grant.
A presentation is never a bearer credential.
`;
}
