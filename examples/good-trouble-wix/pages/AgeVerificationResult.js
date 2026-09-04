// FILE: examples/good-trouble-wix/pages/AgeVerificationResult.js
// Wix Velo page code — /age-verification-result callback page.
// Element IDs: #abraxasStatusText, #restartAbraxasButton (optional)

import { completeAbraxasVerification } from "backend/abraxasVerification.web";
import { GTV_PARAM, PILOT_VERIFIED_SESSION_FLAG, RETURN_DESTINATION_STORAGE_KEY, VERIFIER_STORAGE_PREFIX } from "backend/constants";
import wixLocation from "wix-location";

/** Abraxas frozen callback parameters — never treat status=approved as verification. */
const ALLOWED_CALLBACK_PARAMS = new Set([
  "status",
  "decision_id",
  "receipt_id",
  "receipt_expires_at",
  "credential_id",
  "policy_id",
  "partner_id",
  GTV_PARAM,
]);

const GENERIC_FAILURE =
  "Verification could not be completed. Please try again or use the traditional age option.";
const RESTART_MESSAGE =
  "This verification link was opened in a different browser or tab. Please start again from the age gate.";
const SUCCESS_MESSAGE = "Age verification complete. You may continue shopping.";

let completionStarted = false;

$w.onReady(() => {
  if ($w("#restartAbraxasButton")) {
    $w("#restartAbraxasButton").hide();
    $w("#restartAbraxasButton").onClick(() => {
      wixLocation.to("/");
    });
  }
  void handleCallback();
});

function setStatus(message) {
  if ($w("#abraxasStatusText")) {
    $w("#abraxasStatusText").text = message;
  }
}

function showRestart() {
  if ($w("#restartAbraxasButton")) {
    $w("#restartAbraxasButton").show();
  }
}

function sessionStorageAvailable() {
  try {
    const probe = "__abraxas_gt_probe__";
    sessionStorage.setItem(probe, "1");
    sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function verifierStorageKey(flowId) {
  return `${VERIFIER_STORAGE_PREFIX}${flowId}`;
}

function parseAllowlistedCallbackParams() {
  const query = wixLocation.query;
  const parsed = {};
  for (const key of Object.keys(query)) {
    if (ALLOWED_CALLBACK_PARAMS.has(key)) {
      parsed[key] = query[key];
    }
  }
  return parsed;
}

function clearVerifier(flowId) {
  try {
    sessionStorage.removeItem(verifierStorageKey(flowId));
  } catch {
    // ignore
  }
}

/**
 * Pilot UI convenience only — sessionStorage flag.
 * NOT accepted by Abraxas or Wix backend. Does not authorize purchases,
 * regulated commerce, accounts, email/newsletter enrollment, or rewards.
 * Authoritative proof: consumed backend flow + validated sandbox receipt.
 */
function setPilotVerifiedState() {
  try {
    sessionStorage.setItem(PILOT_VERIFIED_SESSION_FLAG, "1");
  } catch {
    // fail closed — user can still use traditional path
  }
}

function restoreReturnDestination() {
  try {
    const dest = sessionStorage.getItem(RETURN_DESTINATION_STORAGE_KEY);
    sessionStorage.removeItem(RETURN_DESTINATION_STORAGE_KEY);
    if (dest && typeof dest === "string" && dest.startsWith("/") && !dest.startsWith("//")) {
      setTimeout(() => wixLocation.to(dest), 1200);
    }
  } catch {
    // keep success message on callback page
  }
}

async function handleCallback() {
  if (completionStarted) return;
  completionStarted = true;
  setStatus("Completing verification…");

  if (!sessionStorageAvailable()) {
    setStatus(
      "Verification is unavailable in this browser mode. Use the traditional age option or return to the shop.",
    );
    showRestart();
    return;
  }

  const params = parseAllowlistedCallbackParams();
  const flowId = typeof params[GTV_PARAM] === "string" ? params[GTV_PARAM].trim() : "";
  const receiptId = typeof params.receipt_id === "string" ? params.receipt_id.trim() : "";

  if (!flowId || !receiptId) {
    setStatus(GENERIC_FAILURE);
    showRestart();
    return;
  }

  const verifier = sessionStorage.getItem(verifierStorageKey(flowId));
  if (!verifier) {
    setStatus(RESTART_MESSAGE);
    showRestart();
    return;
  }

  try {
    const result = await completeAbraxasVerification(receiptId, flowId, verifier);

    if (result?.verified === true) {
      clearVerifier(flowId);
      setPilotVerifiedState();
      setStatus(SUCCESS_MESSAGE);
      restoreReturnDestination();
      return;
    }

    if (result?.code === "receipt_fetch_transient_failure" && result?.retryable) {
      setStatus("Still confirming verification. Please wait a moment…");
      completionStarted = false;
      setTimeout(() => {
        void handleCallback();
      }, 2000);
      return;
    }

    clearVerifier(flowId);
    if (result?.code === "verifier_mismatch" || result?.code === "missing_verifier") {
      setStatus(RESTART_MESSAGE);
    } else {
      setStatus(GENERIC_FAILURE);
    }
    showRestart();
  } catch {
    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
    showRestart();
  }
}
