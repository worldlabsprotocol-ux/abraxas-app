// FILE: examples/good-trouble-wix/public/browseCallbackCompletion.js
// Wix deployment: src/public/browseCallbackCompletion.js
// Resolve PKCE material for browse callback — sessionStorage first, browse flow-ownership cookie second.

import { parseBrowseFlowOwnershipFromDocumentCookie } from "./browseFlowOwnership.js";

export const RESTART_BROWSE_VERIFICATION_LABEL = "Start again from the age gate";

export const LOST_BROWSE_SESSION_CONTEXT_MESSAGE =
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

const FAILURE_MESSAGES = {
  missing_browse_receipt: "Browsing access could not be confirmed. Please try again.",
  receipt_invalid: "Browsing access could not be confirmed. Please try again.",
  browse_receipt_invalid: "Browsing access could not be confirmed. Please try again.",
  flow_purpose_mismatch: "This link is for a different verification type. Start again from the age gate.",
  flow_exhausted: "This verification session expired. Start again from the age gate.",
  flow_expired: "This verification session expired. Start again from the age gate.",
  flow_already_consumed: "This verification was already used. Please start again from the age gate.",
  receipt_fetch_transient_failure: "Still confirming browsing access. Please wait a moment…",
  missing_verifier: LOST_BROWSE_SESSION_CONTEXT_MESSAGE,
  missing_verifier_escrow: LOST_BROWSE_SESSION_CONTEXT_MESSAGE,
  missing_flow_ownership: LOST_BROWSE_SESSION_CONTEXT_MESSAGE,
  invalid_flow_ownership: LOST_BROWSE_SESSION_CONTEXT_MESSAGE,
  verifier_mismatch: LOST_BROWSE_SESSION_CONTEXT_MESSAGE,
  pkce_escrow_secret_unavailable: "Browsing access could not be confirmed. Please try again.",
};

/**
 * @param {{
 *   flowId: string,
 *   sessionGet: (key: string) => string | null,
 *   verifierStorageKey: (flowId: string) => string,
 *   documentCookie?: string,
 * }} input
 * @returns {{ verifier: string, flowOwnershipSecret: string }}
 */
export function resolveBrowseCallbackPkceMaterial(input) {
  const flowId = input.flowId.trim();
  const verifier = input.sessionGet(input.verifierStorageKey(flowId))?.trim() ?? "";
  const cookie = typeof input.documentCookie === "string" ? input.documentCookie : "";
  const ownership = parseBrowseFlowOwnershipFromDocumentCookie(cookie, flowId);
  const flowOwnershipSecret = ownership?.ownershipSecret?.trim() ?? "";

  return {
    verifier,
    flowOwnershipSecret,
  };
}

/**
 * @param {{ verifier: string, flowOwnershipSecret: string }} material
 */
export function hasBrowseCallbackPkceProof(material) {
  return Boolean(material.verifier?.trim() || material.flowOwnershipSecret?.trim());
}

/**
 * @param {string | undefined} code
 * @param {string} fallback
 */
export function mapBrowseCallbackFailureMessage(code, fallback) {
  if (!code) return fallback;
  return FAILURE_MESSAGES[code] ?? fallback;
}
