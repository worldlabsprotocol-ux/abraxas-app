// FILE: examples/good-trouble-wix/backend/flowStartDiagnostics.js
// Privacy-safe structured diagnostics for verification flow start failures.

import { BROWSE_FLOW, PURCHASE_FLOW } from "./flowPurpose.js";

/** @typedef {"browse" | "purchase"} FlowPurpose */

export const FLOW_START_STAGES = {
  CAPTCHA_GATE: "captcha_gate",
  CAPACITY_PRECHECK: "capacity_precheck",
  PAYLOAD_BUILD: "payload_build",
  NONCE_INSERT: "nonce_insert",
  CAPACITY_FINALIZE: "capacity_finalize",
  RESPONSE_BUILD: "response_build",
};

/** Stable codes safe to return to Preview UI and backend logs. */
export const ALLOWLISTED_FLOW_START_ERROR_CODES = new Set([
  "captcha_required",
  "captcha_invalid",
  "rate_limited",
  "capacity_count_invalid",
  "nonce_insert_failed",
  "payload_build_failed",
  "start_incomplete",
  "start_internal_error",
]);

const PURPOSE_POLICY = {
  browse: {
    purpose: BROWSE_FLOW.purpose,
    policyId: BROWSE_FLOW.policyId,
  },
  purchase: {
    purpose: PURCHASE_FLOW.purpose,
    policyId: PURCHASE_FLOW.policyId,
  },
};

/**
 * @param {FlowPurpose} purpose
 */
export function flowStartContext(purpose) {
  return PURPOSE_POLICY[purpose] ?? PURPOSE_POLICY.purchase;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function mapThrownErrorToStartCode(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("Invalid pending-flow count returned by Wix Data")) {
    return "capacity_count_invalid";
  }
  if (message.includes("wix-data") || message.includes("WixData")) {
    return "nonce_insert_failed";
  }
  return "start_internal_error";
}

/**
 * Privacy-safe backend log payload. Never include verifier, challenge, receipt, token, or PII.
 * @param {{
 *   stage: string,
 *   code: string,
 *   purpose: FlowPurpose,
 *   policyId: string,
 *   correlationId?: string | null,
 * }} entry
 */
export function logFlowStartFailure(entry) {
  const payload = {
    event: "abraxas_flow_start_failed",
    stage: entry.stage,
    code: entry.code,
    purpose: entry.purpose,
    policyId: entry.policyId,
    correlationId: entry.correlationId ?? null,
  };
  console.info(JSON.stringify(payload));
  return payload;
}

/**
 * @param {{
 *   code: string,
 *   stage: string,
 *   purpose: FlowPurpose,
 *   policyId: string,
 *   correlationId?: string | null,
 * }} params
 */
export function buildFlowStartFailure(params) {
  const code = ALLOWLISTED_FLOW_START_ERROR_CODES.has(params.code)
    ? params.code
    : "start_internal_error";

  logFlowStartFailure({
    stage: params.stage,
    code,
    purpose: params.purpose,
    policyId: params.policyId,
    correlationId: params.correlationId ?? null,
  });

  return {
    error: code,
    diagnostic: {
      code,
      stage: params.stage,
      purpose: params.purpose,
      policyId: params.policyId,
      correlationId: params.correlationId ?? null,
    },
  };
}

/**
 * @param {{
 *   verifyUrl: string,
 *   flowId: string,
 *   verifier: string,
 *   purpose: FlowPurpose,
 *   policyId: string,
 *   correlationId?: string | null,
 * }} payload
 */
export function buildFlowStartSuccess(payload) {
  if (!payload.verifyUrl || !payload.flowId || !payload.verifier) {
    return buildFlowStartFailure({
      code: "start_incomplete",
      stage: FLOW_START_STAGES.RESPONSE_BUILD,
      purpose: payload.purpose,
      policyId: payload.policyId,
      correlationId: payload.correlationId ?? null,
    });
  }

  return {
    verifyUrl: payload.verifyUrl,
    flowId: payload.flowId,
    verifier: payload.verifier,
    purpose: payload.purpose,
    policyId: payload.policyId,
    correlationId: payload.correlationId ?? null,
  };
}
