// FILE: examples/good-trouble-wix/public/purchaseCallbackCompletion.js
// Resolve PKCE material for purchase callback — sessionStorage first, flow-ownership cookie second.

import { parseFlowOwnershipFromDocumentCookie } from "./purchaseFlowOwnership.js";

export const LOST_SESSION_CONTEXT_MESSAGE =
  "This verification was opened in a different browser or tab without your checkout session. Return to Good Trouble and tap ORDER NOW to start again.";

export const RESTART_VERIFICATION_LABEL = "Restart verification";

/**
 * @param {{
 *   flowId: string,
 *   sessionGet: (key: string) => string | null,
 *   verifierStorageKey: (flowId: string) => string,
 *   documentCookie?: string,
 * }} input
 * @returns {{ verifier: string, flowOwnershipSecret: string }}
 */
export function resolvePurchaseCallbackPkceMaterial(input) {
  const flowId = input.flowId.trim();
  const verifier = input.sessionGet(input.verifierStorageKey(flowId))?.trim() ?? "";
  const cookie = typeof input.documentCookie === "string" ? input.documentCookie : "";
  const ownership = parseFlowOwnershipFromDocumentCookie(cookie, flowId);
  const flowOwnershipSecret = ownership?.ownershipSecret?.trim() ?? "";

  return {
    verifier,
    flowOwnershipSecret,
  };
}

/**
 * @param {{ verifier: string, flowOwnershipSecret: string }} material
 */
export function hasPurchaseCallbackPkceProof(material) {
  return Boolean(material.verifier?.trim() || material.flowOwnershipSecret?.trim());
}

/**
 * @param {string | undefined | null} code
 */
export function mapPurchaseCallbackFailureMessage(code) {
  if (code === "missing_flow_ownership" || code === "invalid_flow_ownership") {
    return LOST_SESSION_CONTEXT_MESSAGE;
  }
  if (code === "verifier_mismatch" || code === "missing_verifier") {
    return LOST_SESSION_CONTEXT_MESSAGE;
  }
  if (code === "flow_already_consumed") {
    return "This verification was already used. Please start again from ORDER NOW.";
  }
  if (code === "flow_expired") {
    return "This verification session expired. Return to Good Trouble and tap ORDER NOW again.";
  }
  return "Verification could not be completed. Please try again or use the traditional age option.";
}
