#!/usr/bin/env npx tsx
// FILE: scripts/build-592/run-authorized-sandbox-external-evidence.ts

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runLiveInstitutionalHttpJourney } from "@/lib/partner/build584/liveInstitutionalHttpJourney";
import { assessSandboxExecutionResources } from "@/lib/partner/build592/sandboxExecutionAssessment";
import {
  externalVerificationFullyAuthorized,
  type ExternalVerificationProofRecord,
} from "@/lib/partner/build592/externalVerificationProof";
import {
  loadInstitutionOperatedRevocationFeed,
  loadSignedReceiptFromPath,
  resolveTrustEnvFromProcess,
  runExternalRelyingPartyVerification,
} from "@/lib/partner/build592/runExternalRelyingPartyVerification";

type SecurityMatrixResult = { ok: boolean; detail: string };

function runSecurityRejectionsMatrix(): SecurityMatrixResult {
  try {
    execFileSync("node", ["scripts/build587/verify-external-install.mjs"], {
      stdio: "pipe",
      encoding: "utf8",
    });
    return { ok: true, detail: "Clean-room SDK smoke + security-rejections passed." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message.slice(0, 500) };
  }
}

async function main() {
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const assessment = assessSandboxExecutionResources(process.env);
  const liveSteps = await runLiveInstitutionalHttpJourney(process.env);
  const securityMatrix = runSecurityRejectionsMatrix();

  let externalProof: ExternalVerificationProofRecord | null = null;
  let externalProofError: string | null = null;

  const receiptPath = process.env.BUILD592_SIGNED_RECEIPT_PATH?.trim();
  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  const consumptionDir = process.env.RP_CONSUMPTION_DIR?.trim();

  if (receiptPath && partnerId && policyId && consumptionDir) {
    const revocation = loadInstitutionOperatedRevocationFeed(process.env);
    if (!revocation.ok) {
      externalProofError = `revocation_feed:${revocation.code}`;
    } else {
      const trust = await resolveTrustEnvFromProcess(process.env);
      if (!trust.ok) {
        externalProofError = `trust_configuration:${trust.code ?? "unknown"}`;
      } else {
        try {
          const signedRecord = loadSignedReceiptFromPath(receiptPath);
          externalProof = await runExternalRelyingPartyVerification({
            signedRecord,
            partnerId,
            policyId,
            requestId: `build592_${Date.now()}`,
            trustEnv: trust.env,
            consumptionStoreDir: consumptionDir,
            revocationSource: revocation.state,
            executionEnvironment: "cloud_agent",
            sandbox: {
              application_id: process.env.BUILD592_APPLICATION_ID?.trim()
                ?? process.env.BUILD584_APPLICATION_ID?.trim()
                ?? null,
              public_slug: process.env.BUILD592_PUBLIC_SLUG?.trim() ?? null,
              partner_id: partnerId,
              policy_id: policyId,
              policy_version: process.env.BUILD592_POLICY_VERSION
                ? Number(process.env.BUILD592_POLICY_VERSION)
                : null,
              environment: "sandbox",
            },
            trustDigestPin: process.env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST?.trim() ?? null,
          });
        } catch (error) {
          externalProofError = error instanceof Error ? error.message : String(error);
        }
      }
    }
  } else {
    externalProofError = "missing_operator_inputs";
  }

  const holderBlocked = liveSteps.find((s) => s.step === "hosted_holder_authorization");
  const liveReceiptObtained = Boolean(receiptPath);
  const externalAuthorized = externalProof ? externalVerificationFullyAuthorized(externalProof) : false;

  const report = {
    ok: securityMatrix.ok,
    build: 592,
    agent_git_sha: agentGitSha,
    assessment,
    live_institutional_http_journey: liveSteps,
    security_rejections_matrix: securityMatrix,
    execution_summary: {
      signed_sandbox_receipt_obtained: liveReceiptObtained,
      external_independent_verification_attempted: Boolean(receiptPath && partnerId && policyId),
      external_independent_authorization_granted: externalAuthorized,
      abraxas_integration_telemetry_used_as_proof: false,
      holder_authorization_status: holderBlocked?.status ?? "unknown",
      holder_authorization_detail: holderBlocked?.detail ?? null,
    },
    external_verification_proof: externalProof,
    external_verification_error: externalProofError,
    founder_actions_required: assessment.resources
      .filter((r) => r.status === "requires_founder_authorization")
      .map((r) => ({ id: r.id, next_action: r.next_action })),
    operator_next_steps: [
      "Set BUILD592_PARTNER_API_KEY and BUILD592_APPLICATION_ID to run live Launchpad HTTP checks.",
      "Complete hosted holder verification; save signed receipt JSON.",
      "On external RP host: RP_PARTNER_ID, RP_POLICY_ID, RP_CONSUMPTION_DIR, RP_REVOCATION_ADAPTER=institution_operated, trust registry + digest pin.",
      "Set BUILD592_SIGNED_RECEIPT_PATH and re-run npm run build-592:sandbox-external-evidence.",
    ],
  };

  const artifactDir = "/opt/cursor/artifacts";
  mkdirSync(artifactDir, { recursive: true });
  const outPath = join(artifactDir, "build592-external-verification-report.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
  process.exit(securityMatrix.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
