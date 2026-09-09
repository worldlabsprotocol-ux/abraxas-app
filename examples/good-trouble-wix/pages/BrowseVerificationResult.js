// FILE: examples/good-trouble-wix/pages/BrowseVerificationResult.js
// Wix Velo page code — /browse-verification-result (L0 browse callback).

import { completeBrowseVerification } from "backend/abraxasVerification.web";

import {
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import { stripSensitiveCallbackParamsFromHref } from "public/browseCallbackHygiene";
import { setBrowseAccessSessionFlag } from "public/browseAccessUi";
import {
  BROWSE_CALLBACK_GENERIC_FAILURE,
  BROWSE_CALLBACK_RESTART_MESSAGE,
  BROWSE_CALLBACK_SUCCESS_MESSAGE,
  clearFlowVerifier,
  extractBrowseCallbackInputs,
  isBackendBrowseVerificationSuccess,
  parseAllowlistedBrowseCallbackParams,
  resolveSafeReturnDestination,
  shouldRetainVerifierForRetry,
} from "public/browseVerificationCallbackLogic";

import wixLocation from "wix-location";
import { session } from "wix-storage-frontend";

let completionStarted = false;

$w.onReady(() => {
  void handleCallback();
});

function setStatus(message) {
  const statusText = $w("#abraxasStatusText");
  if (statusText) statusText.text = message;
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

function stripCallbackParamsFromAddressBar() {
  try {
    if (typeof window !== "undefined" && window.history?.replaceState) {
      stripSensitiveCallbackParamsFromHref(
        wixLocation.url,
        (state, title, url) => window.history.replaceState(state, title, url),
      );
    }
  } catch {
    // URL hygiene is best-effort; backend validation remains authoritative.
  }
}

function restoreReturnDestination() {
  try {
    const destination = session.getItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    session.removeItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    const safeDestination = resolveSafeReturnDestination(destination);
    setTimeout(() => {
      wixLocation.to(safeDestination);
    }, 1200);
  } catch {
    // Keep success message visible.
  }
}

async function handleCallback() {
  if (completionStarted) return;
  completionStarted = true;
  setStatus("Confirming browsing access…");

  if (!sessionStorageAvailable()) {
    setStatus("Verification is unavailable in this browser. Please restart from the age gate.");
    return;
  }

  const params = parseAllowlistedBrowseCallbackParams(wixLocation.query);
  const { flowId, browseReceipt } = extractBrowseCallbackInputs(params);

  stripCallbackParamsFromAddressBar();

  if (!flowId || !browseReceipt) {
    setStatus(BROWSE_CALLBACK_GENERIC_FAILURE);
    return;
  }

  const verifier = session.getItem(verifierStorageKey(flowId));
  if (!verifier) {
    setStatus(BROWSE_CALLBACK_RESTART_MESSAGE);
    return;
  }

  try {
    const result = await completeBrowseVerification(browseReceipt, flowId, verifier);

    if (isBackendBrowseVerificationSuccess(result)) {
      clearFlowVerifier(verifierStorageKey, session, flowId);
      setBrowseAccessSessionFlag(session);
      setStatus(BROWSE_CALLBACK_SUCCESS_MESSAGE);
      restoreReturnDestination();
      return;
    }

    if (shouldRetainVerifierForRetry(result)) {
      setStatus("Still confirming browsing access. Please wait a moment…");
      completionStarted = false;
      setTimeout(() => { void handleCallback(); }, 2000);
      return;
    }

    clearFlowVerifier(verifierStorageKey, session, flowId);
    setStatus(BROWSE_CALLBACK_GENERIC_FAILURE);
  } catch {
    clearFlowVerifier(verifierStorageKey, session, flowId);
    setStatus(BROWSE_CALLBACK_GENERIC_FAILURE);
  }
}
