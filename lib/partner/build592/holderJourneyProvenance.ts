// FILE: lib/partner/build592/holderJourneyProvenance.ts

import type { ReferenceRelyingPartyConfig } from "@/lib/partner/referenceRelyingPartyConfig";
import { resolveLiveReceiptCorrelation } from "@/lib/partner/universalIntegration/liveReceiptCorrelation";
import { STAGING_LIVE_E2E_ENV_KEYS } from "@/lib/partner/universalIntegration/stagingConfigContract";
import type { ReceiptProvenance } from "@/lib/partner/build592/externalVerificationProof";

export type HolderJourneyProvenanceKind =
  | "unconfirmed"
  | "operator_asserted"
  | "tenant_correlated";

export type AuthenticatedHolderCompletionStatus = "confirmed" | "unconfirmed";

export interface ResolvedHolderJourneyProvenance {
  kind: HolderJourneyProvenanceKind;
  authenticated_holder_completion: AuthenticatedHolderCompletionStatus;
  authenticated_completion_authority: "launchpad_integration_export" | null;
  authenticated_completion_detail: string | null;
  verification_request_id: string | null;
  operator_evidence_ref: string | null;
  correlation_source: string | null;
  receipt_provenance: ReceiptProvenance;
}

export const BUILD592_LIVE_RECEIPT_ARTIFACT_PATH_ENV = "BUILD592_LIVE_RECEIPT_ARTIFACT_PATH";
export const BUILD592_CALLBACK_CAPTURE_URL_ENV = "BUILD592_CALLBACK_CAPTURE_URL";

function minimalRpConfig(partnerId: string, policyId: string): ReferenceRelyingPartyConfig {
  return {
    baseUrl: "https://sandbox.local",
    partnerId,
    policyId,
    returnUrl: "https://sandbox.local/partner/callback",
    displayName: "build592-external-verification",
  };
}

function correlationEnvFromBuild592(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return {
    ...env,
    [STAGING_LIVE_E2E_ENV_KEYS.artifactPath]:
      env[BUILD592_LIVE_RECEIPT_ARTIFACT_PATH_ENV]?.trim()
      ?? env.EXAMPLE_MERCHANT_LIVE_E2E_ARTIFACT?.trim()
      ?? env[STAGING_LIVE_E2E_ENV_KEYS.artifactPath]?.trim(),
    [STAGING_LIVE_E2E_ENV_KEYS.callbackCaptureUrl]:
      env[BUILD592_CALLBACK_CAPTURE_URL_ENV]?.trim()
      ?? env.EXAMPLE_MERCHANT_LIVE_CALLBACK_URL?.trim()
      ?? env[STAGING_LIVE_E2E_ENV_KEYS.callbackCaptureUrl]?.trim(),
    [STAGING_LIVE_E2E_ENV_KEYS.launchpadApplicationId]:
      env.BUILD592_APPLICATION_ID?.trim()
      ?? env.BUILD584_APPLICATION_ID?.trim()
      ?? env[STAGING_LIVE_E2E_ENV_KEYS.launchpadApplicationId]?.trim(),
  };
}

export function resolveHolderJourneyProvenance(input: {
  env: NodeJS.ProcessEnv;
  partnerId: string;
  policyId: string;
  receiptId: string;
  receiptLoadedFromFile: boolean;
}): ResolvedHolderJourneyProvenance {
  const operatorRef = input.env.BUILD592_HOLDER_AUTHORIZATION_EVIDENCE?.trim() ?? null;
  const operatorAsserted =
    input.env.BUILD592_HOLDER_AUTHORIZATION_CONFIRMED?.trim() === "1" && Boolean(operatorRef);

  let receipt_provenance: ReceiptProvenance = "not_supplied";
  if (input.receiptLoadedFromFile) {
    receipt_provenance = "operator_supplied_file";
  }

  const correlation = resolveLiveReceiptCorrelation({
    config: minimalRpConfig(input.partnerId, input.policyId),
    env: correlationEnvFromBuild592(input.env),
  });

  if (correlation.ok && correlation.correlation.receipt_id === input.receiptId) {
    const strongSource =
      correlation.correlation.source === "artifact"
      || correlation.correlation.source === "callback_url";
    if (strongSource) {
      return {
        kind: "tenant_correlated",
        authenticated_holder_completion: "unconfirmed",
        authenticated_completion_authority: null,
        authenticated_completion_detail: "identifier_correlation_only",
        verification_request_id: correlation.correlation.verification_request_id,
        operator_evidence_ref: operatorRef,
        correlation_source: correlation.correlation.source,
        receipt_provenance,
      };
    }
  }

  if (operatorAsserted) {
    return {
      kind: "operator_asserted",
      authenticated_holder_completion: "unconfirmed",
      authenticated_completion_authority: null,
      authenticated_completion_detail: "operator_assertion_only",
      verification_request_id: null,
      operator_evidence_ref: operatorRef,
      correlation_source: null,
      receipt_provenance,
    };
  }

  return {
    kind: "unconfirmed",
    authenticated_holder_completion: "unconfirmed",
    authenticated_completion_authority: null,
    authenticated_completion_detail: null,
    verification_request_id: null,
    operator_evidence_ref: operatorRef,
    correlation_source: null,
    receipt_provenance,
  };
}
