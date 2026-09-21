// FILE: lib/reclaimAttestation/session.ts
// Create short-lived opaque Reclaim sessions. Browser never receives the app secret.

import { RECLAIM_HOLDER_COPY, RECLAIM_SESSION_TTL_MS } from "./contract";
import {
  reclaimAppId,
  reclaimAppSecret,
  reclaimCallbackAllowlisted,
  reclaimCallbackUrl,
  reclaimConfigurationPresent,
  reclaimHmacSecret,
} from "./config";
import { mappingForPolicy } from "./mapping";
import {
  contextAddressFromNonce,
  contextBindingHmac,
  holderBindingHmac,
  nonceHash,
  opaqueCallbackRef,
  opaqueSessionNonce,
  opaqueSessionRef,
  policyBindingHmac,
  verifyRequestHmac,
} from "./opaque";
import { reclaimSdk } from "./sdk";
import { publicReclaimBrowserConfig, reclaimPayloadLeaks, stripSecretsFromRequestConfig } from "./safety";
import { saveReclaimSession } from "./store";
import type { ReclaimSessionCreateInput, ReclaimSessionRecord } from "./types";

export type ReclaimSessionCreateResult =
  | { ok: true; browser: Record<string, unknown>; record: ReclaimSessionRecord }
  | { ok: false; code: string };

export async function createReclaimSession(input: ReclaimSessionCreateInput): Promise<ReclaimSessionCreateResult> {
  if (!reclaimConfigurationPresent() || !reclaimHmacSecret()) {
    return { ok: false, code: "reclaim_configuration_missing" };
  }
  const callbackUrl = reclaimCallbackUrl();
  if (!reclaimCallbackAllowlisted(callbackUrl)) {
    return { ok: false, code: "reclaim_callback_not_allowlisted" };
  }
  const mapping = mappingForPolicy({
    method_category: input.methodCategory,
    result_category: input.resultClass,
    assurance_level: input.assuranceLevel,
    environment: input.environment,
  });
  if (!mapping) return { ok: false, code: "reclaim_mapping_unavailable" };

  const appId = reclaimAppId();
  const appSecret = reclaimAppSecret();
  if (!appId || !appSecret) return { ok: false, code: "reclaim_configuration_missing" };

  const sessionRef = opaqueSessionRef();
  const nonce = opaqueSessionNonce();
  const contextAddress = contextAddressFromNonce(nonce);
  const now = Date.now();
  let sdkResult;
  try {
    sdkResult = await reclaimSdk().createRequest({
      appId,
      appSecret,
      providerId: mapping.provider_id,
      callbackUrl,
      contextAddress,
      sessionRef,
    });
  } catch {
    return { ok: false, code: "reclaim_provider_unavailable" };
  }

  if (sdkResult.providerId !== mapping.provider_id || sdkResult.providerVersion !== mapping.provider_version) {
    return { ok: false, code: "reclaim_provider_version_mismatch" };
  }

  const record: ReclaimSessionRecord = {
    session_ref: sessionRef,
    holder_hmac: holderBindingHmac(input.holderSubject),
    verify_request_hmac: verifyRequestHmac(input.verifyRequest),
    policy_hmac: policyBindingHmac(input.policyId, input.policyVersion),
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    method_category: "privacy_preserving",
    result_class: input.resultClass,
    assurance_level: input.assuranceLevel,
    environment: input.environment,
    mapping_id: mapping.mapping_id,
    provider_id: mapping.provider_id,
    provider_version: mapping.provider_version,
    nonce_hash: nonceHash(nonce),
    context_hmac: contextBindingHmac(contextAddress),
    callback_ref: opaqueCallbackRef(),
    status: "created",
    proof_digest: null,
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + RECLAIM_SESSION_TTL_MS).toISOString(),
    accepted_at: null,
    cancelled_at: null,
    issued_receipt: false,
  };

  try {
    await saveReclaimSession(record);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "schema_unavailable";
    return { ok: false, code };
  }

  const requestConfig = stripSecretsFromRequestConfig(sdkResult.requestConfig);
  const browser = publicReclaimBrowserConfig({
    session_ref: sessionRef,
    request_config: requestConfig,
    expires_at: record.expires_at,
    holder_copy: RECLAIM_HOLDER_COPY,
    issued_receipt: false,
  });
  if (!browser || reclaimPayloadLeaks(browser).length > 0) {
    return { ok: false, code: "disclosure_rejected" };
  }
  return { ok: true, browser, record };
}
