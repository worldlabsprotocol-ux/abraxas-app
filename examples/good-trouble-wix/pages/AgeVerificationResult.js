// FILE: examples/good-trouble-wix/pages/AgeVerificationResult.js
// Wix Velo page code — /age-verification-result callback page.
//
// Required element ID:
// #abraxasStatusText
//
// Optional element ID:
// #restartAbraxasButton

import { completeAbraxasVerification } from "backend/abraxasVerification.web";

import {
  GTV_PARAM,
  PILOT_VERIFIED_SESSION_FLAG,
  RETURN_DESTINATION_STORAGE_KEY,
  VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import wixLocation from "wix-location";

import {
  session,
} from "wix-storage-frontend";

/**
 * Abraxas callback parameters.
 * Never treat status=approved by itself as verification.
 */
const ALLOWED_CALLBACK_PARAMS =
  new Set([
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
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

const SUCCESS_MESSAGE =
  "Age verification complete. Returning you to Good Trouble…";

let completionStarted = false;

$w.onReady(() => {
  configureRestartButton();
  void handleCallback();
});

function configureRestartButton() {
  const restartButton =
    $w("#restartAbraxasButton");

  if (!restartButton) {
    return;
  }

  restartButton.hide();

  restartButton.onClick(() => {
    wixLocation.to("/");
  });
}

function setStatus(message) {
  const statusText =
    $w("#abraxasStatusText");

  if (statusText) {
    statusText.text =
      message;
  }
}

function showRestart() {
  const restartButton =
    $w("#restartAbraxasButton");

  if (restartButton) {
    restartButton.show();
  }
}

function sessionStorageAvailable() {
  try {
    const probe =
      "__abraxas_gt_probe__";

    session.setItem(
      probe,
      "1"
    );

    session.removeItem(
      probe
    );

    return true;
  } catch {
    return false;
  }
}

function verifierStorageKey(flowId) {
  return `${VERIFIER_STORAGE_PREFIX}${flowId}`;
}

function parseAllowlistedCallbackParams() {
  const query =
    wixLocation.query;

  const parsed = {};

  for (
    const key of Object.keys(query)
  ) {
    if (
      ALLOWED_CALLBACK_PARAMS.has(key)
    ) {
      parsed[key] =
        query[key];
    }
  }

  return parsed;
}

function clearVerifier(flowId) {
  try {
    session.removeItem(
      verifierStorageKey(flowId)
    );
  } catch {
    // The verifier will expire with the session.
  }
}

/**
 * Pilot UI convenience only.
 *
 * This session flag is not accepted by Abraxas or the Wix backend
 * as authoritative proof and does not independently authorize
 * regulated purchases or other restricted activity.
 */
function setPilotVerifiedState() {
  try {
    session.setItem(
      PILOT_VERIFIED_SESSION_FLAG,
      "1"
    );
  } catch {
    // Fail closed. The user can restart the flow.
  }
}

function restoreReturnDestination() {
  try {
    const destination =
      session.getItem(
        RETURN_DESTINATION_STORAGE_KEY
      );

    session.removeItem(
      RETURN_DESTINATION_STORAGE_KEY
    );

    if (
      destination &&
      typeof destination === "string" &&
      destination.startsWith("/") &&
      !destination.startsWith("//")
    ) {
      setTimeout(() => {
        wixLocation.to(destination);
      }, 1200);

      return;
    }

    setTimeout(() => {
      wixLocation.to("/");
    }, 1200);
  } catch {
    // Keep the success message visible if navigation fails.
  }
}

async function handleCallback() {
  if (completionStarted) {
    return;
  }

  completionStarted = true;

  setStatus(
    "Completing verification…"
  );

  if (!sessionStorageAvailable()) {
    setStatus(
      "Verification is unavailable in this browser. Please restart from the age gate."
    );

    showRestart();
    return;
  }

  const params =
    parseAllowlistedCallbackParams();

  const rawFlowId =
    params[GTV_PARAM];

  const rawReceiptId =
    params.receipt_id;

  const flowId =
    typeof rawFlowId === "string"
      ? rawFlowId.trim()
      : "";

  const receiptId =
    typeof rawReceiptId === "string"
      ? rawReceiptId.trim()
      : "";

  if (!flowId || !receiptId) {
    setStatus(
      GENERIC_FAILURE
    );

    showRestart();
    return;
  }

  const verifier =
    session.getItem(
      verifierStorageKey(flowId)
    );

  if (!verifier) {
    setStatus(
      RESTART_MESSAGE
    );

    showRestart();
    return;
  }

  try {
    const result =
      await completeAbraxasVerification(
        receiptId,
        flowId,
        verifier
      );

    if (result?.verified === true) {
      clearVerifier(flowId);
      setPilotVerifiedState();

      setStatus(
        SUCCESS_MESSAGE
      );

      restoreReturnDestination();
      return;
    }

    if (
      result?.code ===
        "receipt_fetch_transient_failure" &&
      result?.retryable === true
    ) {
      setStatus(
        "Still confirming verification. Please wait a moment…"
      );

      completionStarted = false;

      setTimeout(() => {
        void handleCallback();
      }, 2000);

      return;
    }

    clearVerifier(flowId);

    if (
      result?.code ===
        "verifier_mismatch" ||
      result?.code ===
        "missing_verifier"
    ) {
      setStatus(
        RESTART_MESSAGE
      );
    } else {
      setStatus(
        GENERIC_FAILURE
      );
    }

    showRestart();
  } catch {
    clearVerifier(flowId);

    setStatus(
      GENERIC_FAILURE
    );

    showRestart();
  }
}