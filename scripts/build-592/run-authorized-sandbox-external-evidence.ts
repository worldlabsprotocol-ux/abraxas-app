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
  buildExternalVerificationExecutionReport,
} from "@/lib/partner/build592/externalVerificationExecutionStatus";
import {
  loadPortableRevocationBootstrapTrustsFromEnv,
  loadPortableRevocationIssuerTrustFromEnv,
  loadPortableRevocationSnapshotFromEnv,
} from "@/lib/partner/build592/portableRevocationLoader";
import {
  evaluateAuthenticatedHolderCompletionFromIntegrationExport,
  fetchLaunchpadIntegrationExport,
  mergeAuthenticatedHolderCompletion,
} from "@/lib/partner/build592/authenticatedHolderCompletion";
import { resolveHolderJourneyProvenance } from "@/lib/partner/build592/holderJourneyProvenance";
import { resolvePortableRevocationCheckpointDir } from "@/lib/partner/build592/portableRevocationCheckpoint";
import {
  loadSignedReceiptFromPath,
  resolveProductionTrustEnvFromProcess,
  runProductionExternalVerification,
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

  const receiptPath = process.env.BUILD592_SIGNED_RECEIPT_PATH?.trim();
  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  const consumptionDir = process.env.RP_CONSUMPTION_DIR?.trim();
  const receiptPathPresent = Boolean(receiptPath);
  const checkpointDir = resolvePortableRevocationCheckpointDir(process.env);
  let holderJourney = resolveHolderJourneyProvenance({
    env: process.env,
    partnerId: partnerId ?? "",
    policyId: policyId ?? "",
    receiptId: "",
    receiptLoadedFromFile: receiptPathPresent,
  });

  let externalProof: ExternalVerificationProofRecord | null = null;
  let externalProofError: string | null = null;
  let externalVerifierRan = false;

  if (receiptPath && partnerId && policyId && consumptionDir) {
    const portable = loadPortableRevocationSnapshotFromEnv(process.env);
    const issuerTrust = loadPortableRevocationIssuerTrustFromEnv(process.env);
    if (!portable.ok) {
      externalProofError = `portable_revocation:${portable.code}`;
    } else if (!issuerTrust.ok) {
      externalProofError = `portable_revocation:${issuerTrust.code}`;
    } else {
      const trust = await resolveProductionTrustEnvFromProcess(process.env);
      if (!trust.ok) {
        externalProofError = `trust_configuration:${trust.code ?? "unknown"}`;
      } else {
        try {
          const signedRecord = loadSignedReceiptFromPath(receiptPath);
          holderJourney = resolveHolderJourneyProvenance({
            env: process.env,
            partnerId,
            policyId,
            receiptId: signedRecord.id,
            receiptLoadedFromFile: true,
          });
          const applicationId =
            process.env.BUILD592_APPLICATION_ID?.trim()
            ?? process.env.BUILD584_APPLICATION_ID?.trim()
            ?? null;
          if (applicationId) {
            const exported = await fetchLaunchpadIntegrationExport({
              env: process.env,
              applicationId,
              verificationRequestId: holderJourney.verification_request_id,
            });
            if (exported.ok) {
              const authenticated = evaluateAuthenticatedHolderCompletionFromIntegrationExport({
                export: exported.export,
                expectedPartnerId: partnerId,
                expectedApplicationId: applicationId,
                expectedPolicyId: policyId,
                expectedReceiptId: signedRecord.id,
                expectedVerificationRequestId: holderJourney.verification_request_id,
              });
              holderJourney = mergeAuthenticatedHolderCompletion(holderJourney, authenticated);
            }
          }
          const bootstrapTrusts = loadPortableRevocationBootstrapTrustsFromEnv(
            process.env,
            portable.bootstrapTrusts,
          );
          externalVerifierRan = true;
          const outcome = await runProductionExternalVerification({
            signedRecord,
            partnerId,
            policyId,
            requestId: `build592_${Date.now()}`,
            trustEnv: trust.env,
            trustDigestPin: process.env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST?.trim() ?? trust.receipt_key_document_digest,
            consumptionStoreDir: consumptionDir,
            checkpointStoreDir: checkpointDir,
            portableRevocationSnapshot: portable.snapshot,
            portableRevocationIssuerTrust: issuerTrust.policy,
            portableRevocationBootstrapTrusts: bootstrapTrusts,
            executionEnvironment: "cloud_agent",
            receiptProvenance: holderJourney.receipt_provenance,
            holderJourney,
            expectedApplicationId: process.env.BUILD592_APPLICATION_ID?.trim()
              ?? process.env.BUILD584_APPLICATION_ID?.trim()
              ?? null,
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
          });
          if (!outcome.ok) {
            externalProofError = outcome.code;
          } else {
            externalProof = outcome.proof;
          }
        } catch (error) {
          externalProofError = error instanceof Error ? error.message : String(error);
        }
      }
    }
  } else {
    externalProofError = "missing_operator_inputs";
  }

  const externalAuthorized = externalProof ? externalVerificationFullyAuthorized(externalProof) : false;

  const execution = buildExternalVerificationExecutionReport({
    syntheticSecurityPassed: securityMatrix.ok,
    liveHttpSteps: liveSteps,
    holderJourneyProvenance: holderJourney.kind,
    authenticatedHolderCompletion: holderJourney.authenticated_holder_completion,
    operatorHolderEvidenceRef: process.env.BUILD592_HOLDER_AUTHORIZATION_EVIDENCE?.trim() ?? null,
    receiptSuppliedViaFile: receiptPathPresent,
    externalVerifierRan,
    externalAuthorizationGranted: externalAuthorized,
    externalProofGenerated: Boolean(externalProof),
    securityDetail: securityMatrix.detail,
  });

  const report = {
    build: 592,
    agent_git_sha: agentGitSha,
    execution,
    assessment,
    live_institutional_http_journey: liveSteps,
    security_rejections_matrix: securityMatrix,
    external_verification_proof: externalProof,
    external_verification_error: externalProofError,
    authenticated_revocation_mechanism: "portable_revocation_snapshot",
    founder_actions_required: assessment.resources
      .filter((r) => r.status === "requires_founder_authorization")
      .map((r) => ({ id: r.id, next_action: r.next_action })),
    operator_next_steps: [
      "Set BUILD592_PARTNER_API_KEY and BUILD592_APPLICATION_ID for live Launchpad HTTP checks.",
      "Optional operator note: BUILD592_HOLDER_AUTHORIZATION_CONFIRMED=1 + BUILD592_HOLDER_AUTHORIZATION_EVIDENCE (not authenticated provenance).",
      "For verified holder journey provenance, supply BUILD592_LIVE_RECEIPT_ARTIFACT_PATH or BUILD592_CALLBACK_CAPTURE_URL correlating receipt_id to tenant scope.",
      "Set BUILD592_PORTABLE_REVOCATION_CHECKPOINT_DIR (or ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR) for durable revocation checkpoint monotonicity.",
      "Pin ABRAXAS_RECEIPT_VERIFICATION_REGISTRY and ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST; supply BUILD592_PORTABLE_REVOCATION_SNAPSHOT_PATH and issuer trust JSON.",
      "Run on external RP host with RP_CONSUMPTION_DIR, RP_PARTNER_ID, RP_POLICY_ID.",
    ],
  };

  const artifactDir = "/opt/cursor/artifacts";
  mkdirSync(artifactDir, { recursive: true });
  const outPath = join(artifactDir, "build592-external-verification-report.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
  process.exit(execution.diagnostic_command_ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
