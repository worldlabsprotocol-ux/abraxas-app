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
  BROWSE_CALLBACK_COMPLETION_TIMEOUT_MS,
  BROWSE_CALLBACK_MAX_TRANSIENT_RETRIES,
  BROWSE_CALLBACK_TRANSIENT_RETRY_MS,
  BROWSE_SUCCESS_MESSAGE,
  CHECKING_BROWSE_MESSAGE,
  parseAllowlistedCallbackParams,
  POST_BROWSE_REDIRECT_DELAY_MS,
  resolveBrowsePostVerificationRedirectDestination,
  shouldContinueAfterBrowseVerification,
  canRedirectAfterBrowseVerification,
} from "public/browseCallbackLogic";

import {
  hasBrowseCallbackPkceProof,
  mapBrowseCallbackFailureMessage,
  resolveBrowseCallbackPkceMaterial,
  RESTART_BROWSE_VERIFICATION_LABEL,
  LOST_BROWSE_SESSION_CONTEXT_MESSAGE,
} from "public/browseCallbackCompletion";

import { clearBrowseFlowOwnershipCookie } from "public/browseFlowOwnership";

import { persistBrowseVerifiedState } from "public/ageGateAccessState";

import wixLocation from "wix-location";
import { local, session } from "wix-storage-frontend";

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

let completionStarted = false;
let transientRetries = 0;
let completionTimeoutId = null;

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

function clearCompletionTimeout() {
  if (completionTimeoutId) {
    clearTimeout(completionTimeoutId);
    completionTimeoutId = null;
  }
}

function armCompletionTimeout(flowId) {
  clearCompletionTimeout();
  completionTimeoutId = setTimeout(() => {
    completionStarted = false;
    transientRetries = 0;
    if (flowId) clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
    showRestart();
  }, BROWSE_CALLBACK_COMPLETION_TIMEOUT_MS);
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
function setBrowseAccessState(expiresAtIso) {
  const verifiedAt = Date.now();
  try {
    session.setItem(BROWSE_ACCESS_STORAGE_KEY, String(verifiedAt));
  } catch {
    // Fail closed for navigation only; user can retry.
  }

  const expiresAt = expiresAtIso ? Date.parse(expiresAtIso) : NaN;
  if (Number.isFinite(expiresAt) && expiresAt > verifiedAt) {
    try {
      persistBrowseVerifiedState(local, { expiresAt, verifiedAt });
    } catch {
      // Session flag remains; local persistence is best-effort for age-gate UI only.
    }
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

  armCompletionTimeout(flowId);

  if (!flowId || !browseReceipt) {
    clearCompletionTimeout();
    setStatus(GENERIC_FAILURE);
    showRestart();
    return;
  }

  const pkceMaterial = resolveBrowseCallbackPkceMaterial({
    flowId,
    sessionGet: (key) => session.getItem(key),
    verifierStorageKey,
    documentCookie: typeof document !== "undefined" ? document.cookie : "",
  });

  if (!hasBrowseCallbackPkceProof(pkceMaterial)) {
    clearCompletionTimeout();
    setStatus(LOST_BROWSE_SESSION_CONTEXT_MESSAGE);
    showRestart();
    return;
  }

  try {
    const result = await completeBrowseVerification(
      browseReceipt,
      flowId,
      pkceMaterial.verifier,
      pkceMaterial.flowOwnershipSecret,
    );

    if (shouldContinueAfterBrowseVerification(result)) {
      clearCompletionTimeout();
      clearVerifier(flowId);
      try {
        clearBrowseFlowOwnershipCookie((cookie) => {
          // eslint-disable-next-line no-undef
          document.cookie = cookie;
        });
      } catch {
        // Non-authoritative cleanup.
      }
      setBrowseAccessState(result.expires_at);
      redirectAfterVerified(result);
      return;
    }

    if (result?.code === "receipt_fetch_transient_failure" && result?.retryable === true) {
      transientRetries += 1;
      if (transientRetries >= BROWSE_CALLBACK_MAX_TRANSIENT_RETRIES) {
        clearCompletionTimeout();
        clearVerifier(flowId);
        setStatus(mapBrowseCallbackFailureMessage("flow_exhausted", GENERIC_FAILURE));
        showRestart();
        return;
      }
      setStatus(mapBrowseCallbackFailureMessage(result.code, GENERIC_FAILURE));
      completionStarted = false;
      setTimeout(() => { void handleCallback(); }, BROWSE_CALLBACK_TRANSIENT_RETRY_MS);
      return;
    }

    clearCompletionTimeout();
    clearVerifier(flowId);
    setStatus(mapBrowseCallbackFailureMessage(result?.code, GENERIC_FAILURE));
    showRestart();
  } catch {
    clearCompletionTimeout();
    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
    showRestart();
  }
}
