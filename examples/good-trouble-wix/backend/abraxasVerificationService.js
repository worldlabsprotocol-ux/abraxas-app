// FILE: examples/good-trouble-wix/backend/abraxasVerificationService.js
// Testable Abraxas verification service — separate browse (L0) and purchase (L2+) lifecycles.

import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { verifyBrowseReceiptRemotely } from "./browseReceiptRemoteValidator.js";
import { authorizeCaptchaToken } from "./captchaGate.js";
import { MAX_OUTSTANDING_PENDING_FLOWS } from "./constants.js";
import {
  buildFlowStartFailure,
  buildFlowStartSuccess,
  flowStartContext,
  FLOW_START_STAGES,
  mapThrownErrorToStartCode,
} from "./flowStartDiagnostics.js";
import {
  assertCapacityAvailable,
  finalizeFlowStart,
} from "./flowCapacity.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
  completeBrowseVerificationCore,
} from "./nonceLifecycle.js";
import { sha256Hex as defaultSha256Hex } from "./sha256Adapter.js";

/** @type {((value: string) => Promise<string> | string) | null} */
let configuredHashFn = null;

export function configureAbraxasHashFn(hashFn) {
  configuredHashFn = hashFn;
}

export function __testOnlySetHashFn(hashFn) {
  configuredHashFn = hashFn;
}

function resolveHashFn(depsHashFn) {
  if (depsHashFn) return depsHashFn;
  if (configuredHashFn) return configuredHashFn;
  return defaultSha256Hex;
}

async function resolveStore(deps) {
  if (deps.store) return deps.store;
  const { createWixNonceStore } = await import("./wixNonceStore.js");
  return createWixNonceStore();
}

/**
 * @param {"browse" | "purchase"} purpose
 * @param {string | null | undefined} captchaToken
 * @param {object} [deps]
 */
async function startFlow(purpose, captchaToken, deps = {}) {
  const context = flowStartContext(purpose);

  try {
    if (!deps.skipCaptcha) {
      const captcha = await authorizeCaptchaToken(captchaToken, deps.authorizeCaptcha);
      if (!captcha.ok) {
        return buildFlowStartFailure({
          code: captcha.code,
          stage: FLOW_START_STAGES.CAPTCHA_GATE,
          purpose: context.purpose,
          policyId: context.policyId,
        });
      }
    }

    const store = await resolveStore(deps);
    const hashFn = resolveHashFn(deps.hashFn);
    const now = deps.now ?? new Date();

    const capacity = await assertCapacityAvailable(store, MAX_OUTSTANDING_PENDING_FLOWS, now);
    if (!capacity.ok) {
      return buildFlowStartFailure({
        code: capacity.code,
        stage: FLOW_START_STAGES.CAPACITY_PRECHECK,
        purpose: context.purpose,
        policyId: context.policyId,
      });
    }

    let payload;
    try {
      payload = await buildVerificationStartPayload({ hashFn, now, purpose });
    } catch {
      return buildFlowStartFailure({
        code: "payload_build_failed",
        stage: FLOW_START_STAGES.PAYLOAD_BUILD,
        purpose: context.purpose,
        policyId: context.policyId,
      });
    }

    let inserted;
    try {
      inserted = await store.insert(payload.flowRecord);
    } catch {
      return buildFlowStartFailure({
        code: "nonce_insert_failed",
        stage: FLOW_START_STAGES.NONCE_INSERT,
        purpose: context.purpose,
        policyId: context.policyId,
        correlationId: payload.flowRecord.correlationId,
      });
    }

    const finalized = await finalizeFlowStart(
      store,
      inserted._id,
      MAX_OUTSTANDING_PENDING_FLOWS,
      now,
    );
    if (!finalized.ok) {
      return buildFlowStartFailure({
        code: finalized.code,
        stage: FLOW_START_STAGES.CAPACITY_FINALIZE,
        purpose: context.purpose,
        policyId: context.policyId,
        correlationId: payload.flowRecord.correlationId,
      });
    }

    return buildFlowStartSuccess({
      verifyUrl: payload.verifyUrl,
      flowId: payload.flowId,
      verifier: payload.verifier,
      purpose: payload.purpose,
      policyId: payload.policyId,
      correlationId: payload.flowRecord.correlationId,
    });
  } catch (error) {
    return buildFlowStartFailure({
      code: mapThrownErrorToStartCode(error),
      stage: FLOW_START_STAGES.CAPACITY_PRECHECK,
      purpose: context.purpose,
      policyId: context.policyId,
    });
  }
}

export async function createBrowseVerificationStartService(captchaToken, deps = {}) {
  return startFlow("browse", captchaToken, deps);
}

export async function createPurchaseVerificationStartService(captchaToken, deps = {}) {
  return startFlow("purchase", captchaToken, deps);
}

/** @deprecated Use createPurchaseVerificationStartService */
export async function createAbraxasVerificationStartService(captchaToken, deps = {}) {
  return createPurchaseVerificationStartService(captchaToken, {
    ...deps,
    skipCaptcha: deps.skipCaptcha ?? true,
  });
}

export async function completePurchaseVerificationService(receiptId, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateReceipt = async (id) => {
    try {
      const result = await fetchAndValidateSandboxReceipt(id);
      return { verified: result.verified, transientFailure: false };
    } catch {
      return { verified: false, transientFailure: true };
    }
  };

  return completeAbraxasVerificationCore({
    store,
    receiptId,
    flowId,
    verifier,
    hashFn,
    validateReceipt: deps.validateReceipt ?? defaultValidateReceipt,
  });
}

export async function completeBrowseVerificationService(browseReceipt, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateBrowse = async (token, record) => {
    const result = await verifyBrowseReceiptRemotely(token, { fetchImpl: deps.fetchImpl });
    if (result.transientFailure) {
      return { verified: false, transientFailure: true };
    }
    if (!result.verified) {
      return { verified: false, transientFailure: false };
    }
    if (record?.policyId && result.payload?.policy_id !== record.policyId) {
      return { verified: false, transientFailure: false };
    }
    return { verified: true, transientFailure: false };
  };

  return completeBrowseVerificationCore({
    store,
    browseReceipt,
    flowId,
    verifier,
    hashFn,
    validateBrowseReceipt: deps.validateBrowseReceipt ?? defaultValidateBrowse,
  });
}

/** @deprecated Use completePurchaseVerificationService */
export async function completeAbraxasVerificationService(receiptId, flowId, verifier, deps = {}) {
  return completePurchaseVerificationService(receiptId, flowId, verifier, deps);
}
