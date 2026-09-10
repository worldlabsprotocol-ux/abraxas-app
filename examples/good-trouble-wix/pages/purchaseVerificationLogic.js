// FILE: examples/good-trouble-wix/pages/purchaseVerificationLogic.js
// Wix deployment: copy to src/public/purchaseVerificationLogic.js

export const PURCHASE_STATUS_STARTING =
  "Starting purchase eligibility verification…";

export const PURCHASE_STATUS_GENERIC_FAILURE =
  "Verification could not be started. Please try again.";

export const PURCHASE_STATUS_RATE_LIMITED =
  "Verification is busy. Please wait a moment and try again.";

/** Stable backend codes that may surface distinct user-facing copy. */
export const ALLOWLISTED_PURCHASE_START_ERROR_CODES = new Set([
  "rate_limited",
  "capacity_count_invalid",
  "nonce_insert_failed",
]);

export const PURCHASE_START_ERROR_MESSAGES = {
  rate_limited: PURCHASE_STATUS_RATE_LIMITED,
  capacity_count_invalid: PURCHASE_STATUS_GENERIC_FAILURE,
  nonce_insert_failed: PURCHASE_STATUS_GENERIC_FAILURE,
  start_incomplete: PURCHASE_STATUS_GENERIC_FAILURE,
  start_exception: PURCHASE_STATUS_GENERIC_FAILURE,
  start_internal_error: PURCHASE_STATUS_GENERIC_FAILURE,
};

/**
 * @param {string} viewMode
 * @returns {boolean}
 */
export function isEditorPreviewViewMode(viewMode) {
  return viewMode === "Preview" || viewMode === "Editor";
}

/**
 * @param {string} code
 * @returns {string}
 */
export function safePurchaseStartErrorMessage(code) {
  return PURCHASE_START_ERROR_MESSAGES[code] ?? PURCHASE_STATUS_GENERIC_FAILURE;
}

/**
 * Preview-only operator hint. Never includes verifier, receipt, token, or PII.
 * @param {{ code?: string, stage?: string, correlationId?: string | null } | null | undefined} diagnostic
 * @returns {string | null}
 */
export function formatPurchasePreviewDiagnostic(diagnostic) {
  if (!diagnostic?.code) return null;
  const parts = [diagnostic.code];
  if (diagnostic.stage) parts.push(`@${diagnostic.stage}`);
  if (diagnostic.correlationId) parts.push(`ref=${diagnostic.correlationId}`);
  return parts.join(" ");
}

/**
 * @param {{
 *   result?: {
 *     error?: string,
 *     diagnostic?: { code?: string, stage?: string, correlationId?: string | null },
 *     verifyUrl?: string,
 *     flowId?: string,
 *     verifier?: string,
 *   } | null,
 *   viewMode?: string,
 * }} params
 * @returns {{ ok: true, result: object } | { ok: false, code: string, message: string, previewDetail?: string }}
 */
export function interpretPurchaseStartResult(params) {
  const result = params.result;
  const viewMode = params.viewMode ?? "Site";
  const preview = isEditorPreviewViewMode(viewMode);
  const previewDetail = preview
    ? formatPurchasePreviewDiagnostic(result?.diagnostic)
    : null;

  if (result?.error) {
    const code = result.error;
    const message = ALLOWLISTED_PURCHASE_START_ERROR_CODES.has(code)
      ? safePurchaseStartErrorMessage(code)
      : PURCHASE_STATUS_GENERIC_FAILURE;
    return {
      ok: false,
      code,
      message,
      ...(previewDetail ? { previewDetail } : {}),
    };
  }

  const { verifyUrl, flowId, verifier } = result ?? {};
  if (!verifyUrl || !flowId || !verifier) {
    return {
      ok: false,
      code: "start_incomplete",
      message: PURCHASE_STATUS_GENERIC_FAILURE,
      ...(previewDetail ? { previewDetail: previewDetail ?? "start_incomplete" } : {}),
    };
  }

  if (!flowId.startsWith("gtf_")) {
    return {
      ok: false,
      code: "start_incomplete",
      message: PURCHASE_STATUS_GENERIC_FAILURE,
      ...(previewDetail ? { previewDetail: previewDetail ?? "invalid_flow_id_prefix" } : {}),
    };
  }

  return {
    ok: true,
    result: {
      verifyUrl,
      flowId,
      verifier,
      purpose: result?.purpose,
      policyId: result?.policyId,
      correlationId: result?.correlationId ?? null,
    },
  };
}

/**
 * @param {{
 *   setStatus: (message: string) => void,
 *   startPurchaseVerification: () => Promise<object>,
 *   getViewMode?: () => string | Promise<string>,
 *   storeVerifier: (flowId: string, verifier: string) => void,
 *   saveReturnDestination: () => void,
 *   navigateToVerifyUrl: (url: string) => void,
 * }} deps
 */
export function createPurchaseVerificationController(deps) {
  return {
    async start() {
      deps.setStatus(PURCHASE_STATUS_STARTING);

      try {
        const result = await deps.startPurchaseVerification();
        const viewMode = deps.getViewMode ? await deps.getViewMode() : "Site";
        const interpreted = interpretPurchaseStartResult({ result, viewMode });

        if (!interpreted.ok) {
          const suffix = interpreted.previewDetail
            ? ` (${interpreted.previewDetail})`
            : "";
          deps.setStatus(`${interpreted.message}${suffix}`);
          return interpreted;
        }

        if (isEditorPreviewViewMode(viewMode)) {
          deps.setStatus(
            `Preview check passed: purchase flow ready (${interpreted.result.flowId.slice(0, 8)}…).`,
          );
          return { ok: true, code: "preview_backend_passed", result: interpreted.result };
        }

        deps.saveReturnDestination();
        deps.storeVerifier(interpreted.result.flowId, interpreted.result.verifier);
        deps.navigateToVerifyUrl(interpreted.result.verifyUrl);
        return { ok: true, code: "redirecting", result: interpreted.result };
      } catch {
        const viewMode = deps.getViewMode ? await deps.getViewMode() : "Site";
        const preview = isEditorPreviewViewMode(viewMode);
        deps.setStatus(
          preview
            ? `${PURCHASE_STATUS_GENERIC_FAILURE} (start_exception)`
            : PURCHASE_STATUS_GENERIC_FAILURE,
        );
        return { ok: false, code: "start_exception", message: PURCHASE_STATUS_GENERIC_FAILURE };
      }
    },
  };
}
