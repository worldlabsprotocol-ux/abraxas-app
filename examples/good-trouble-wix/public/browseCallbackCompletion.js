// FILE: examples/good-trouble-wix/public/browseCallbackCompletion.js
// Wix deployment: src/public/browseCallbackCompletion.js

export const RESTART_BROWSE_VERIFICATION_LABEL = "Start again from the age gate";

const FAILURE_MESSAGES = {
  missing_browse_receipt: "Browsing access could not be confirmed. Please try again.",
  receipt_invalid: "Browsing access could not be confirmed. Please try again.",
  browse_receipt_invalid: "Browsing access could not be confirmed. Please try again.",
  flow_purpose_mismatch: "This link is for a different verification type. Start again from the age gate.",
  flow_exhausted: "This verification session expired. Start again from the age gate.",
  receipt_fetch_transient_failure: "Still confirming browsing access. Please wait a moment…",
};

/**
 * @param {string | undefined} code
 * @param {string} fallback
 */
export function mapBrowseCallbackFailureMessage(code, fallback) {
  if (!code) return fallback;
  return FAILURE_MESSAGES[code] ?? fallback;
}
