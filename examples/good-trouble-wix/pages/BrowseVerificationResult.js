// FILE: examples/good-trouble-wix/pages/BrowseVerificationResult.js
// Wix Velo page code — /browse-verification-result (L0 browse callback).

import { completeBrowseVerification } from "backend/abraxasVerification.web";

import {
  BROWSE_ACCESS_STORAGE_KEY,
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
  GTB_PARAM,
} from "public/abraxasClientConstants";

import {
  BROWSE_SUCCESS_MESSAGE,
  CHECKING_BROWSE_MESSAGE,
  parseAllowlistedCallbackParams,
  POST_BROWSE_REDIRECT_DELAY_MS,
  resolveBrowsePostVerificationRedirectDestination,
  shouldContinueAfterBrowseVerification,
  canRedirectAfterBrowseVerification,
} from "public/browseCallbackLogic";

import {
  mapBrowseCallbackFailureMessage,
  RESTART_BROWSE_VERIFICATION_LABEL,
} from "public/browseCallbackCompletion";

import wixLocation from "wix-location";
import { session } from "wix-storage-frontend";

const ALLOWED_CALLBACK_PARAMS = new Set([
  "browse_receipt",
  "browse_receipt_id",
  "partner_id",
  "policy_id",
  "purpose",
  GTB_PARAM,
]);

const GENERIC_FAILURE =
  "Browsing access could not be confirmed. Please try again.";

const RESTART_MESSAGE =
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

let completionStarted = false;

$w.onReady(() => {
  configureRestartButton();
  void handleCallback();
});

function configureRestartButton() {
  const restartButton = $w("#restartAbraxasButton");
  if (!restartButton) return;
  restartButton.hide();
  restartButton.label = RESTART_BROWSE_VERIFICATION_LABEL;
  restartButton.onClick(() => {
    wixLocation.to("/");
  });
}

function setStatus(message) {
  const statusText = $w("#abraxasStatusText");
  if (statusText) statusText.text = message;
}

function showRestart() {
  const restartButton = $w("#restartAbraxasButton");
  if (restartButton) restartButton.show();
}

function sessionStorageAvailable() {
  try {
    const probe = "__abraxas_gt_browse_probe__";
    session.setItem(probe, "1");
    session.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function verifierStorageKey(flowId) {
  return `${BROWSE_VERIFIER_STORAGE_PREFIX}${flowId}`;
}

function clearVerifier(flowId) {
  try {
    session.removeItem(verifierStorageKey(flowId));
  } catch {
    // non-authoritative cleanup
  }
}

/** L0 browse UI flag — may dismiss age popup; never checkout authority. */
function setBrowseAccessState() {
  try {
    session.setItem(BROWSE_ACCESS_STORAGE_KEY, String(Date.now()));
  } catch {
    // Fail closed for navigation only; user can retry.
  }
}

function redirectAfterVerified(result) {
  let sessionDestination = null;
  try {
    sessionDestination = session.getItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    session.removeItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
  } catch {
    // Fall back to server path or /goods.
  }

  const destination = resolveBrowsePostVerificationRedirectDestination({
    serverDestination: result?.returnDestination ?? null,
    sessionDestination,
  });

  if (!canRedirectAfterBrowseVerification(destination)) {
    setStatus(BROWSE_SUCCESS_MESSAGE);
    return;
  }

  setStatus(BROWSE_SUCCESS_MESSAGE);
  setTimeout(() => {
    wixLocation.to(destination);
  }, POST_BROWSE_REDIRECT_DELAY_MS);
}

async function handleCallback() {
  if (completionStarted) return;
  completionStarted = true;
  setStatus(CHECKING_BROWSE_MESSAGE);

  if (!sessionStorageAvailable()) {
    setStatus("Verification is unavailable in this browser. Please restart from the age gate.");
    showRestart();
    return;
  }

  const params = parseAllowlistedCallbackParams(wixLocation.query, ALLOWED_CALLBACK_PARAMS);
  const flowId = typeof params[GTB_PARAM] === "string" ? params[GTB_PARAM].trim() : "";
  const browseReceipt = typeof params.browse_receipt === "string" ? params.browse_receipt.trim() : "";

  if (!flowId || !browseReceipt) {
    setStatus(GENERIC_FAILURE);
    showRestart();
    return;
  }

  const verifier = session.getItem(verifierStorageKey(flowId));
  if (!verifier) {
    setStatus(RESTART_MESSAGE);
    showRestart();
    return;
  }

  try {
    const result = await completeBrowseVerification(browseReceipt, flowId, verifier);

    if (shouldContinueAfterBrowseVerification(result)) {
      clearVerifier(flowId);
      setBrowseAccessState();
      redirectAfterVerified(result);
      return;
    }

    if (result?.code === "receipt_fetch_transient_failure" && result?.retryable === true) {
      setStatus(mapBrowseCallbackFailureMessage(result.code, GENERIC_FAILURE));
      completionStarted = false;
      setTimeout(() => { void handleCallback(); }, 2000);
      return;
    }

    clearVerifier(flowId);
    setStatus(mapBrowseCallbackFailureMessage(result?.code, GENERIC_FAILURE));
    showRestart();
  } catch {
    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
    showRestart();
  }
}
