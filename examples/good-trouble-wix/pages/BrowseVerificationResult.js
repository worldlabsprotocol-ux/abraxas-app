// FILE: examples/good-trouble-wix/pages/BrowseVerificationResult.js
// Wix Velo page code — /browse-verification-result (L0 browse callback).

import { completeBrowseVerification } from "backend/abraxasVerification.web";

import {
  BROWSE_ACCESS_STORAGE_KEY,
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
  GTB_PARAM,
} from "public/abraxasClientConstants";

import wixLocation from "wix-location";
import { session } from "wix-storage-frontend";

const ALLOWED_CALLBACK_PARAMS = new Set([
  "browse_receipt",
  "partner_id",
  "policy_id",
  "purpose",
  GTB_PARAM,
]);

const GENERIC_FAILURE =
  "Browsing access could not be confirmed. Please try again.";

const RESTART_MESSAGE =
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

const SUCCESS_MESSAGE =
  "Browsing access confirmed. Returning you to Good Trouble…";

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

function parseAllowlistedCallbackParams() {
  const query = wixLocation.query;
  const parsed = {};
  for (const key of Object.keys(query)) {
    if (ALLOWED_CALLBACK_PARAMS.has(key)) parsed[key] = query[key];
  }
  return parsed;
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

function restoreReturnDestination() {
  try {
    const destination = session.getItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    session.removeItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    if (destination && typeof destination === "string" && destination.startsWith("/") && !destination.startsWith("//")) {
      setTimeout(() => { wixLocation.to(destination); }, 1200);
      return;
    }
    setTimeout(() => { wixLocation.to("/"); }, 1200);
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

  const params = parseAllowlistedCallbackParams();
  const flowId = typeof params[GTB_PARAM] === "string" ? params[GTB_PARAM].trim() : "";
  const browseReceipt = typeof params.browse_receipt === "string" ? params.browse_receipt.trim() : "";

  if (!flowId || !browseReceipt) {
    setStatus(GENERIC_FAILURE);
    return;
  }

  const verifier = session.getItem(verifierStorageKey(flowId));
  if (!verifier) {
    setStatus(RESTART_MESSAGE);
    return;
  }

  try {
    const result = await completeBrowseVerification(browseReceipt, flowId, verifier);

    if (result?.verified === true && result?.purpose === "browse") {
      clearVerifier(flowId);
      setBrowseAccessState();
      setStatus(SUCCESS_MESSAGE);
      restoreReturnDestination();
      return;
    }

    if (result?.code === "receipt_fetch_transient_failure" && result?.retryable === true) {
      setStatus("Still confirming browsing access. Please wait a moment…");
      completionStarted = false;
      setTimeout(() => { void handleCallback(); }, 2000);
      return;
    }

    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
  } catch {
    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
  }
}
