// FILE: examples/good-trouble-wix/pages/AgeVerificationPopup.js
// Wix Velo page code — Age Verification popup (lightbox or page).
// Wix deployment: paste into the Age Verification popup page code panel.
//
// Required element IDs:
// #yesButton
// #noButton
// #abraxasButton
// #abraxasStatusText

import { createAbraxasVerificationStart } from "backend/abraxasVerification.web";

import {
  VERIFIER_STORAGE_PREFIX,
  RETURN_DESTINATION_STORAGE_KEY,
} from "public/abraxasClientConstants";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import wixWindowFrontend from "wix-window-frontend";

import {
  local,
  session,
} from "wix-storage-frontend";

import {
  createPopupController,
  createPopupInitializationGuard,
} from "public/ageVerificationPopupLogic";

const popupInitGuard =
  createPopupInitializationGuard();

/**
 * @type {ReturnType<typeof createPopupController> | null}
 */
let popupController = null;

$w.onReady(() => {
  const initialized =
    popupInitGuard.initializeOnce(() => {
      popupController =
        createPopupController({
          async setAbraxasButtonEnabled(
            enabled
          ) {
            await setButtonEnabled(
              "#abraxasButton",
              enabled
            );
          },

          setAbraxasButtonLabel(label) {
            setButtonLabel(
              "#abraxasButton",
              label
            );
          },

          setStatus(message) {
            const statusText =
              $w("#abraxasStatusText");

            if (statusText) {
              statusText.text =
                message;
            }
          },

          startAbraxasVerification: () =>
            createAbraxasVerificationStart(),

          sessionStorageAvailable,

          storeVerifier(
            flowId,
            verifier
          ) {
            session.setItem(
              verifierStorageKey(flowId),
              verifier
            );
          },

          saveReturnDestination() {
            try {
              const currentUrl =
                String(
                  wixLocationFrontend.url ||
                    ""
                );

              const path =
                currentUrl
                  .split("?")[0]
                  .replace(
                    /^https?:\/\/[^/]+/,
                    ""
                  ) || "/";

              session.setItem(
                RETURN_DESTINATION_STORAGE_KEY,
                path
              );
            } catch {
              // Saving the destination is helpful,
              // but it is not authoritative.
            }
          },

          navigateToVerifyUrl(url) {
            wixLocationFrontend.to(url);
          },

          getViewMode: () =>
            wixWindowFrontend.viewMode,

          storage: local,

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

async function setButtonEnabled(
  selector,
  enabled
) {
  const element =
    $w(selector);

  if (!element) {
    return;
  }

  if (enabled) {
    await element.enable();
  } else {
    await element.disable();
  }
}

function setButtonLabel(
  selector,
  label
) {
  const element =
    $w(selector);

  if (!element) {
    return;
  }

  element.label =
    label;
}

function wireButtons() {
  $w("#yesButton").onClick(() => {
    void popupController?.onTraditionalYesClick();
  });

  $w("#abraxasButton").onClick(() => {
    void popupController?.onAbraxasClick();
  });

  // #noButton intentionally keeps its
  // Wix-configured default behavior.
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