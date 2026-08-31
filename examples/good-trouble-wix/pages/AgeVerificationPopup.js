// FILE: examples/good-trouble-wix/pages/AgeVerificationPopup.js
// Wix Velo page code — Age Verification popup (lightbox or page).
// Wix deployment: paste into the Age Verification popup page code panel.
// Required element IDs: #yesButton, #noButton, #abraxasButton, #abraxasCaptcha, #abraxasStatusText

import { createAbraxasVerificationStart } from "backend/abraxasVerification.web";
import { VERIFIER_STORAGE_PREFIX } from "backend/constants";
import wixWindow from "wix-window";
import {
  ABRAXAS_LABEL,
  createPopupController,
} from "public/ageVerificationPopupLogic";

/** @type {ReturnType<typeof createPopupController> | null} */
let popupController = null;

$w.onReady(() => {
  if ($w("#abraxasButton")) {
    $w("#abraxasButton").label = ABRAXAS_LABEL;
  }

  popupController = createPopupController({
    setAbraxasButtonEnabled(enabled) {
      setButtonEnabled("#abraxasButton", enabled);
    },
    setStatus(message) {
      if ($w("#abraxasStatusText")) {
        $w("#abraxasStatusText").text = message;
      }
    },
    async getCaptchaToken() {
      if (!$w("#abraxasCaptcha")) return "";
      return $w("#abraxasCaptcha").getToken();
    },
    resetCaptcha() {
      if ($w("#abraxasCaptcha")) {
        $w("#abraxasCaptcha").reset();
      }
    },
    startAbraxasVerification: (token) => createAbraxasVerificationStart(token),
    sessionStorageAvailable,
    storeVerifier(flowId, verifier) {
      sessionStorage.setItem(verifierStorageKey(flowId), verifier);
    },
    navigateToVerifyUrl(url) {
      window.location.href = url;
    },
    storage: typeof localStorage !== "undefined" ? localStorage : null,
    onTraditionalYesComplete() {
      if (wixWindow.lightbox) {
        wixWindow.lightbox.close();
      }
    },
  });

  popupController.onReady();

  wireCaptchaElement();
  wireButtons();
});

function setButtonEnabled(selector, enabled) {
  const element = $w(selector);
  if (!element) return;
  element.enable();
  if (!enabled) element.disable();
}

function wireCaptchaElement() {
  const captcha = $w("#abraxasCaptcha");
  if (!captcha || !popupController) return;

  captcha.onVerified(() => {
    popupController.onCaptchaVerified();
  });

  captcha.onTimeout(() => {
    popupController.onCaptchaInvalidated();
  });

  captcha.onError(() => {
    popupController.onCaptchaInvalidated();
  });
}

function wireButtons() {
  // Traditional self-attestation — enabled on load; no CAPTCHA required.
  $w("#yesButton").onClick(() => {
    void popupController?.onTraditionalYesClick();
  });

  $w("#abraxasButton").onClick(() => {
    void popupController?.onAbraxasClick();
  });

  // #noButton ("No, I'm not") intentionally not gated — remains enabled by default.
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
