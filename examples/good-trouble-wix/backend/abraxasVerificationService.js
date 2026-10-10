// FILE: examples/good-trouble-wix/backend/abraxasVerificationService.js
// Testable Abraxas verification service — separate browse (L0) and purchase (L2+) lifecycles.

import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { verifyBrowseReceiptRemotely } from "./browseReceiptRemoteValidator.js";
import { authorizeCaptchaToken } from "./captchaGate.js";
import {
  BROWSE_POLICY_ID,
  FLOW_ID_PREFIX_BROWSE,
  MAX_OUTSTANDING_PENDING_FLOWS,
} from "./constants.js";
import {
  buildFlowStartFailure,
  buildFlowStartSuccess,
  flowStartContext,
  FLOW_START_STAGES,
  isFlowStartFailure,
  mapThrownErrorToStartCode,
} from "./flowStartDiagnostics.js";
import { createWixNonceStore } from "./wixNonceStore.js";
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
import { fetchPkceEscrowPepper } from "./pkceEscrowPepper.js";
import { loadPkceEscrowPepperFromWixSecrets } from "./pkceEscrowPepperWix.js";

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

function resolveStore(deps) {
  if (deps.store) return deps.store;
  return createWixNonceStore();
}

/**
 * @param {object} [deps]
 * @returns {Promise<{ ok: true, pepper: string } | { ok: false, code: string }>}
 */
async function resolveEscrowPepperForService(deps = {}) {
  if (typeof deps.escrowPepper === "string" && deps.escrowPepper.trim()) {
    return fetchPkceEscrowPepper({ pepperOverride: deps.escrowPepper });
  }
  if (deps.pepperOverride != null) {
    return fetchPkceEscrowPepper(deps);
  }
  if (typeof deps.getSecret === "function") {
    return fetchPkceEscrowPepper({ getSecret: deps.getSecret });
  }
  return loadPkceEscrowPepperFromWixSecrets();
}

/**
 * @param {"browse" | "purchase"} purpose
 * @param {string | null | undefined} captchaToken
 * @param {object} [deps]
 * @param {string | null | undefined} [returnDestinationPath]
 */
async function startFlow(purpose, captchaToken, deps = {}, returnDestinationPath = null) {
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

    let escrowPepper = null;
    if (purpose === "purchase" || purpose === "browse") {
      const pepperResult = await resolveEscrowPepperForService(deps);
      if (!pepperResult.ok) {
        return buildFlowStartFailure({
          code: pepperResult.code,
          stage: FLOW_START_STAGES.PAYLOAD_BUILD,
          purpose: context.purpose,
          policyId: context.policyId,
        });
      }
      escrowPepper = pepperResult.pepper;
    }

    let payload;
    try {
      payload = await buildVerificationStartPayload({
        hashFn,
        now,
        purpose,
        returnDestinationPath: purpose === "purchase" ? returnDestinationPath : null,
        escrowPepper,
      });
    } catch (error) {
      const code = error instanceof Error && "code" in error
        ? String(error.code)
        : "payload_build_failed";
      return buildFlowStartFailure({
        code,
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
      flowOwnershipSecret: payload.flowOwnershipSecret ?? null,
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
  const result = await startFlow("browse", captchaToken, deps);
  if (isFlowStartFailure(result)) return result;

  const flowId = result.flowId;
  const policyId = result.policyId;
  const purpose = result.purpose;
  const verifyUrl = result.verifyUrl;

  if (
    purpose !== "browse"
    || policyId !== BROWSE_POLICY_ID
    || !flowId.startsWith(FLOW_ID_PREFIX_BROWSE)
    || !result.flowOwnershipSecret
    || !verifyUrl.includes(BROWSE_POLICY_ID)
    || !verifyUrl.includes("purpose=browse")
    || verifyUrl.includes("good-trouble-age_21_retail-v1")
    || verifyUrl.includes("app=good-trouble")
    || verifyUrl.includes("age-verification-result")
    || verifyUrl.match(/gtf_/)
  ) {
    return buildFlowStartFailure({
      code: "start_internal_error",
      stage: FLOW_START_STAGES.RESPONSE_BUILD,
      purpose: "browse",
      policyId: BROWSE_POLICY_ID,
      correlationId: result.correlationId ?? null,
    });
  }

  return result;
}

export async function createPurchaseVerificationStartService(
  captchaToken,
  deps = {},
  returnDestinationPath = null,
) {
  return startFlow("purchase", captchaToken, deps, returnDestinationPath);
}

/** @deprecated Use createPurchaseVerificationStartService */
export async function createAbraxasVerificationStartService(captchaToken, deps = {}) {
  return createPurchaseVerificationStartService(captchaToken, {
    ...deps,
    skipCaptcha: deps.skipCaptcha ?? true,
  });
}

export async function completePurchaseVerificationService(
  receiptId,
  flowId,
  verifier,
  fourthArg = "",
  fifthArg = {},
) {
  let flowOwnershipSecret = "";
  /** @type {object} */
  let deps = {};
  if (typeof fourthArg === "string") {
    flowOwnershipSecret = fourthArg;
    deps = fifthArg ?? {};
  } else {
    deps = fourthArg ?? {};
  }

  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateReceipt = async (id) => {
    try {
      const result = await fetchAndValidateSandboxReceipt(id);
      return {
        verified: result.verified,
        transientFailure: Boolean(result.transientFailure),
        expires_at: result.expires_at ?? null,
      };
    } catch {
      return { verified: false, transientFailure: true };
    }
  };

  let escrowPepper = null;
  const needsEscrowPepper = !verifier?.trim() && Boolean(flowOwnershipSecret?.trim());
  if (needsEscrowPepper) {
    const pepperResult = await resolveEscrowPepperForService(deps);
    if (!pepperResult.ok) {
      return { verified: false, code: pepperResult.code };
    }
    escrowPepper = pepperResult.pepper;
  }

  return completeAbraxasVerificationCore({
    store,
    receiptId,
    flowId,
    verifier,
    flowOwnershipSecret,
    escrowPepper,
    hashFn,
    validateReceipt: deps.validateReceipt ?? defaultValidateReceipt,
  });
}

export async function completeBrowseVerificationService(
  browseReceipt,
  flowId,
  verifier,
  fourthArg = "",
  fifthArg = {},
) {
  let flowOwnershipSecret = "";
  /** @type {object} */
  let deps = {};
  if (typeof fourthArg === "string") {
    flowOwnershipSecret = fourthArg;
    deps = fifthArg ?? {};
  } else {
    deps = fourthArg ?? {};
  }

  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  let escrowPepper = null;
  const needsEscrowPepper = !verifier?.trim() && Boolean(flowOwnershipSecret?.trim());
  if (needsEscrowPepper) {
    const pepperResult = await resolveEscrowPepperForService(deps);
    if (!pepperResult.ok) {
      return { verified: false, code: pepperResult.code };
    }
    escrowPepper = pepperResult.pepper;
  }

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
    return {
      verified: true,
      transientFailure: false,
      expires_at: result.payload?.expires_at ?? null,
    };
  };

  return completeBrowseVerificationCore({
    store,
    browseReceipt,
    flowId,
    verifier,
    flowOwnershipSecret,
    escrowPepper,
    hashFn,
    validateBrowseReceipt: deps.validateBrowseReceipt ?? defaultValidateBrowse,
  });
}

/** @deprecated Use completePurchaseVerificationService */
export async function completeAbraxasVerificationService(receiptId, flowId, verifier, deps = {}) {
  return completePurchaseVerificationService(receiptId, flowId, verifier, deps);
}
