// FILE: examples/good-trouble-wix/pages/PurchaseVerificationEntry.js
// Wix Velo page code — regulated purchase eligibility (L2+) entry point.

import { createPurchaseVerificationStart } from "backend/abraxasVerification.web";

import {
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import { session } from "wix-storage-frontend";

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") return;
  wirePurchaseButton();
});

function wirePurchaseButton() {
  const button = $w("#purchaseAbraxasButton");
  if (!button) return;

  button.onClick(() => {
    void startPurchaseVerification();
  });
}

async function startPurchaseVerification() {
  const status = $w("#purchaseStatusText");
  if (status) {
    status.text = "Starting purchase eligibility verification…";
  }

  try {
    const result = await createPurchaseVerificationStart();
    if (!result?.verifyUrl || !result?.flowId || !result?.verifier) {
      if (status) status.text = "Verification could not be started. Please try again.";
      return;
    }

    saveReturnDestination();
    session.setItem(
      `${PURCHASE_VERIFIER_STORAGE_PREFIX}${result.flowId}`,
      result.verifier,
    );
    wixLocationFrontend.to(result.verifyUrl);
  } catch {
    if (status) status.text = "Verification could not be started. Please try again.";
  }
}

function saveReturnDestination() {
  try {
    const currentUrl = String(wixLocationFrontend.url || "");
    const path = currentUrl.split("?")[0].replace(/^https?:\/\/[^/]+/, "") || "/";
    session.setItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY, path);
  } catch {
    // non-authoritative
  }
}
