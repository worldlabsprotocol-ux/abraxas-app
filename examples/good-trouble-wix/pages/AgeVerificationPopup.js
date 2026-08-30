// FILE: examples/good-trouble-wix/pages/AgeVerificationPopup.js
// Wix Velo page code — Age Verification popup (lightbox or page).
// Element IDs: #yesButton, #abraxasButton, #abraxasStatusText

import { createAbraxasVerificationStart } from "backend/abraxasVerification.web";
import { VERIFIER_STORAGE_PREFIX } from "backend/constants";

const ABRAXAS_LABEL = "Verify with Abraxas Passport";
const ABRAXAS_SUPPORT =
  "Optional verification for faster future setup. Your ID photos and date of birth are not shared with Good Trouble.";

let abraxasStarting = false;

$w.onReady(() => {
  if ($w("#abraxasButton")) {
    $w("#abraxasButton").label = ABRAXAS_LABEL;
  }
  if ($w("#abraxasStatusText")) {
    $w("#abraxasStatusText").text = ABRAXAS_SUPPORT;
  }

  $w("#yesButton").onClick(() => {
    // Traditional self-attestation — unchanged, independent of Abraxas.
    // Operator: close lightbox / grant age gate per existing Good Trouble logic.
  });

  $w("#abraxasButton").onClick(() => {
    void handleAbraxasStart();
  });
});

function setAbraxasStatus(message) {
  if ($w("#abraxasStatusText")) {
    $w("#abraxasStatusText").text = message;
  }
}

function setAbraxasButtonEnabled(enabled) {
  if ($w("#abraxasButton")) {
    $w("#abraxasButton").enable();
    if (!enabled) $w("#abraxasButton").disable();
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

async function handleAbraxasStart() {
  if (abraxasStarting) return;
  abraxasStarting = true;
  setAbraxasButtonEnabled(false);
  setAbraxasStatus("Starting verification…");

  if (!sessionStorageAvailable()) {
    setAbraxasStatus(
      "Verification is unavailable in this browser mode. Use “Yes, I’m 21 or older” or try another browser.",
    );
    abraxasStarting = false;
    setAbraxasButtonEnabled(true);
    return;
  }

  try {
    const result = await createAbraxasVerificationStart();

    if (result?.error) {
      setAbraxasStatus("Verification could not be started. Please try again or use the traditional option.");
      abraxasStarting = false;
      setAbraxasButtonEnabled(true);
      return;
    }

    const { verifyUrl, flowId, verifier } = result;
    if (!verifyUrl || !flowId || !verifier) {
      setAbraxasStatus("Verification could not be started. Please try again or use the traditional option.");
      abraxasStarting = false;
      setAbraxasButtonEnabled(true);
      return;
    }

    sessionStorage.setItem(verifierStorageKey(flowId), verifier);
    window.location.href = verifyUrl;
  } catch {
    setAbraxasStatus("Verification could not be started. Please try again or use the traditional option.");
    abraxasStarting = false;
    setAbraxasButtonEnabled(true);
  }
}
