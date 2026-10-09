// FILE: examples/good-trouble-wix/pages/AgeVerificationResult.js
// Wix Velo page code — /age-verification-result callback page.
//
// Required element ID:
// #abraxasStatusText
//
// Optional element ID:
// #restartAbraxasButton

import { completePurchaseVerification } from "backend/abraxasVerification.web";

import {
  GTV_PARAM,
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIED_SESSION_FLAG,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import {
  CHECKING_VERIFICATION_MESSAGE,
  parseAllowlistedCallbackParams,
  POST_VERIFICATION_REDIRECT_DELAY_MS,
  resolvePostVerificationRedirectDestination,
  shouldContinueAfterPurchaseVerification,
  SUCCESS_CONTINUATION_MESSAGE,
} from "public/purchaseCallbackLogic";

import { hasUntrustedRedirectQueryParams } from "public/purchaseReturnDestination";

import { persistPurchaseVerifiedState } from "public/ageGateAccessState";

import wixLocation from "wix-location";

import {
  local,
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
  return `${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`;
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
function setPurchaseVerifiedState(expiresAtIso) {
  const verifiedAt = Date.now();
  try {
    session.setItem(
      PURCHASE_VERIFIED_SESSION_FLAG,
      String(verifiedAt),
    );
  } catch {
    // Fail closed. The user can restart the flow.
  }

  const expiresAt = expiresAtIso ? Date.parse(expiresAtIso) : NaN;
  if (Number.isFinite(expiresAt) && expiresAt > verifiedAt) {
    try {
      persistPurchaseVerifiedState(local, { expiresAt, verifiedAt });
    } catch {
      // Session flag remains; local persistence is best-effort for age-gate UI only.
    }
  }
}

function readSessionReturnDestination() {
  try {
    return session.getItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearSessionReturnDestination() {
  try {
    session.removeItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY);
  } catch {
    // Non-authoritative cleanup.
  }
}

function continueToShoppingDestination(serverDestination) {
  const destination = resolvePostVerificationRedirectDestination({
    serverDestination,
    sessionDestination: readSessionReturnDestination(),
  });

  clearSessionReturnDestination();

  setTimeout(() => {
    wixLocation.to(destination);
  }, POST_VERIFICATION_REDIRECT_DELAY_MS);
}

async function handleCallback() {
  if (completionStarted) {
    return;
  }

  completionStarted = true;

  setStatus(
    CHECKING_VERIFICATION_MESSAGE
  );

  if (!sessionStorageAvailable()) {
    setStatus(
      "Verification is unavailable in this browser. Please restart from the age gate."
    );

    showRestart();
    return;
  }

  const query = wixLocation.query ?? {};

  if (hasUntrustedRedirectQueryParams(query)) {
    setStatus(GENERIC_FAILURE);
    showRestart();
    return;
  }

  const params =
    parseAllowlistedCallbackParams(query, ALLOWED_CALLBACK_PARAMS);

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
      await completePurchaseVerification(
        receiptId,
        flowId,
        verifier
      );

    if (shouldContinueAfterPurchaseVerification(result)) {
      clearVerifier(flowId);
      setPurchaseVerifiedState(result.expires_at);

      setStatus(
        SUCCESS_CONTINUATION_MESSAGE
      );

      continueToShoppingDestination(result.returnDestination);
      return;
    }

    if (
      result?.code ===
        "receipt_fetch_transient_failure" &&
      result?.retryable === true
    ) {
      setStatus(
        CHECKING_VERIFICATION_MESSAGE
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
    } else if (result?.code === "flow_already_consumed") {
      setStatus(
        "This verification was already used. Please start again from ORDER NOW."
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
