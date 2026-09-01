// FILE: examples/good-trouble-wix/pages/AgeVerificationPopup.js
// Wix Velo page code — Age Verification popup (lightbox or page).
// Wix deployment: paste into the Age Verification popup page code panel.
// Required element IDs: #yesButton, #noButton, #abraxasButton, #abraxasStatusText

import { createAbraxasVerificationStart } from "backend/abraxasVerification.web";
import { VERIFIER_STORAGE_PREFIX } from "backend/constants";
import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import wixWindowFrontend from "wix-window-frontend";
import {
  createPopupController,
  createPopupInitializationGuard,
} from "public/ageVerificationPopupLogic";

const popupInitGuard = createPopupInitializationGuard();

/** @type {ReturnType<typeof createPopupController> | null} */
let popupController = null;

$w.onReady(() => {
  if (!isBrowserRenderEnvironment()) {
    return;
  }

  const initialized = popupInitGuard.initializeOnce(() => {
    popupController = createPopupController({
      async setAbraxasButtonEnabled(enabled) {
        await setButtonEnabled("#abraxasButton", enabled);
      },
      setAbraxasButtonLabel(label) {
        setButtonLabel("#abraxasButton", label);
      },
      setStatus(message) {
        if ($w("#abraxasStatusText")) {
          $w("#abraxasStatusText").text = message;
        }
      },
      startAbraxasVerification: () => createAbraxasVerificationStart(),
      sessionStorageAvailable,
      storeVerifier(flowId, verifier) {
        sessionStorage.setItem(verifierStorageKey(flowId), verifier);
      },
      navigateToVerifyUrl(url) {
        wixLocationFrontend.to(url);
      },
      getViewMode: () => wixWindowFrontend.viewMode,
      storage: typeof localStorage !== "undefined" ? localStorage : null,
      onTraditionalYesComplete() {
        if (wixWindow.lightbox) {
          wixWindow.lightbox.close();
        }
      },
    });

    void popupController.onReady();
    wireButtons();
  });

  if (!initialized.ok) {
    return;
  }
});

function isBrowserRenderEnvironment() {
  try {
    return wixWindow.rendering.env === "browser";
  } catch {
    return typeof window !== "undefined";
  }
}

async function setButtonEnabled(selector, enabled) {
  const element = $w(selector);
  if (!element) return;

  if (enabled) {
    await element.enable();
  } else {
    await element.disable();
  }
}

function setButtonLabel(selector, label) {
  const element = $w(selector);
  if (!element) return;
  element.label = label;
}

function wireButtons() {
  // Traditional self-attestation — enabled on load; independent of Abraxas.
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
