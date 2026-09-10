// FILE: examples/good-trouble-wix/pages/PurchaseVerificationEntry.js
// Wix Velo page code — regulated purchase eligibility (L2+) entry point.

import { createPurchaseVerificationStart } from "backend/abraxasVerification.web";

import {
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import { createPurchaseVerificationController } from "public/purchaseVerificationLogic";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import wixWindowFrontend from "wix-window-frontend";
import { session } from "wix-storage-frontend";

/** @type {ReturnType<typeof createPurchaseVerificationController> | null} */
let purchaseController = null;

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") return;
  wirePurchaseButton();
});

function wirePurchaseButton() {
  const button = $w("#purchaseAbraxasButton");
  if (!button) return;

  purchaseController = createPurchaseVerificationController({
    setStatus(message) {
      const status = $w("#purchaseStatusText");
      if (status) status.text = message;
    },

    startPurchaseVerification: () => createPurchaseVerificationStart(),

    getViewMode: () => wixWindowFrontend.viewMode,

    storeVerifier(flowId, verifier) {
      session.setItem(`${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`, verifier);
    },

    saveReturnDestination() {
      try {
        const currentUrl = String(wixLocationFrontend.url || "");
        const path = currentUrl.split("?")[0].replace(/^https?:\/\/[^/]+/, "") || "/";
        session.setItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY, path);
      } catch {
        // non-authoritative
      }
    },

    navigateToVerifyUrl(url) {
      wixLocationFrontend.to(url);
    },
  });

  button.onClick(() => {
    void purchaseController?.start();
  });
}
