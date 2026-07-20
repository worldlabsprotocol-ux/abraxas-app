// FILE: lib/authenticationProof/runE2eVerificationCheck.ts
// Honest in-process e2e check: verify → proof → independent validation.
// Used by GET /api/verify/e2e — does not fake completed gates.

import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { toAgentProofView, toAgentVerifyView } from "@/lib/agentVerification";
import { issueProductionReferenceProof } from "./productionReference";
import { loadReceiptSigningKey, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";

export interface E2eVerificationCheckResult {
  ok: boolean;
  summary: string;
  signing_configured: boolean;
  verification_key_configured: boolean;
  supabase_configured: boolean;
  steps: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  production_reference?: {
    asset_id: string;
    proof_id: string | null;
    verify_agent_proceed: boolean;
    proof_agent_valid: boolean;
  };
  agent_flow: string[];
  blockers: string[];
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function runE2eVerificationCheck(): Promise<E2eVerificationCheckResult> {
  const signingConfigured = Boolean(loadReceiptSigningKey());
  const verificationKeyConfigured = Boolean(loadReceiptVerificationKey());
  const supabaseConfigured = Boolean(SB_URL && SB_KEY);
  const blockers: string[] = [];
  const steps: E2eVerificationCheckResult["steps"] = [];

  steps.push({
    id: "signing-key",
    label: "ABRAXAS_SIGNING_KEY configured",
    passed: signingConfigured,
    detail: signingConfigured ? "Signing key loaded" : "Missing — proofs will be unsigned in production",
  });
  if (!signingConfigured) blockers.push("ABRAXAS_SIGNING_KEY");

  steps.push({
    id: "verification-key",
    label: "ABRAXAS_PUBLIC_KEY or signing key for verify",
    passed: verificationKeyConfigured,
    detail: verificationKeyConfigured ? "Verification key available" : "Missing — signature_valid will be false",
  });
  if (!verificationKeyConfigured) blockers.push("ABRAXAS_PUBLIC_KEY or ABRAXAS_SIGNING_KEY");

  steps.push({
    id: "supabase",
    label: "Supabase authentication_proofs persistence",
    passed: supabaseConfigured,
    detail: supabaseConfigured
      ? "DB configured for GET /api/proof/[id] lookup"
      : "Missing — proof lookup returns 404 after issuance",
  });
  if (!supabaseConfigured) blockers.push("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");

  let productionRef: E2eVerificationCheckResult["production_reference"];
  let referencePassed = false;

  // Run production reference path with ephemeral test keys if production keys missing
  const testKey = generateTestSigningKeyPair();
  const prevSign = process.env.ABRAXAS_SIGNING_KEY;
  const prevPub = process.env.ABRAXAS_PUBLIC_KEY;
  if (!signingConfigured) {
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);
  }

  try {
    const result = await issueProductionReferenceProof("ABX-RE-HOSP-001");
    if ("error" in result) {
      steps.push({
        id: "production-reference",
        label: "Cielo Sunrise production reference proof",
        passed: false,
        detail: "Reference asset path failed",
      });
    } else {
      const verifyAgent = toAgentVerifyView(result.verify_response);
      const proofAgent = toAgentProofView(result.self_verified_proof);
      referencePassed = verifyAgent.proceed && proofAgent.valid;
      productionRef = {
        asset_id: "ABX-RE-HOSP-001",
        proof_id: result.verify_response.proof_id,
        verify_agent_proceed: verifyAgent.proceed,
        proof_agent_valid: proofAgent.valid,
      };
      steps.push({
        id: "production-reference",
        label: "Cielo Sunrise: verify → proof → self-verify",
        passed: referencePassed,
        detail: referencePassed
          ? `proof_id ${result.verify_response.proof_id} — agent.proceed and agent.valid true`
          : `verify proceed=${verifyAgent.proceed} proof valid=${proofAgent.valid}`,
      });
      steps.push({
        id: "agent-envelope",
        label: "Agent-friendly response envelopes present",
        passed: Boolean(result.verify_response.agent && result.self_verified_proof.agent),
        detail: "verify_response.agent and self_verified_proof.agent attached",
      });
    }
  } finally {
    if (!signingConfigured) {
      if (prevSign) process.env.ABRAXAS_SIGNING_KEY = prevSign;
      else delete process.env.ABRAXAS_SIGNING_KEY;
      if (prevPub) process.env.ABRAXAS_PUBLIC_KEY = prevPub;
      else delete process.env.ABRAXAS_PUBLIC_KEY;
    }
  }

  const corePassed = steps.filter(s => s.id !== "supabase").every(s => s.passed);
  const fullyLive = signingConfigured && verificationKeyConfigured && supabaseConfigured && referencePassed;

  return {
    ok: corePassed,
    summary: fullyLive
      ? "End-to-end verify → proof → independent validation is live in production."
      : corePassed
        ? "Core cryptography path works; production persistence or keys may be incomplete."
        : "E2e verification path has failures — see steps.",
    signing_configured: signingConfigured,
    verification_key_configured: verificationKeyConfigured,
    supabase_configured: supabaseConfigured,
    steps,
    production_reference: productionRef,
    agent_flow: [
      "POST /api/credentials/verify → read agent.proceed",
      "GET verify_url → read agent.valid",
      "Act only when both true",
    ],
    blockers,
  };
}
