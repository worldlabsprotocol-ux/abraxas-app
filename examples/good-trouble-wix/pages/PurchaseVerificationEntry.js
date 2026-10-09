// FILE: examples/good-trouble-wix/pages/PurchaseVerificationEntry.js
// Wix Velo page code — regulated purchase eligibility (L0+) entry point.

import { createPurchaseVerificationStart } from "backend/abraxasVerification.web";

import {
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import { createPurchaseVerificationController } from "public/purchaseVerificationLogic";
import { persistFlowOwnershipCookie } from "public/purchaseFlowOwnership";

import {
  parsePurchaseEntryFromQuery,
  resolvePurchaseReturnDestinationForStart,
} from "public/purchaseReturnDestination";

import { shouldSkipAgeGate } from "public/ageGateAccessState";

import {
  GOOD_TROUBLE_THE_GOODS_SHOP_PATH,
} from "public/abraxasClientConstants";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import wixWindowFrontend from "wix-window-frontend";
import { local, session } from "wix-storage-frontend";

/** @type {ReturnType<typeof createPurchaseVerificationController> | null} */
let purchaseController = null;

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") return;

  const skip = shouldSkipAgeGate({
    localStorage: local,
    sessionStorage: session,
  });
  if (skip.skip) {
    wixLocationFrontend.to(GOOD_TROUBLE_THE_GOODS_SHOP_PATH);
    return;
  }

  captureOrderNowOriginFromQuery();
  wirePurchaseButton();
});

function captureOrderNowOriginFromQuery() {
  try {
    const fromQuery = parsePurchaseEntryFromQuery(wixLocationFrontend.query ?? {});
    if (!fromQuery) return;
    session.setItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY, fromQuery);
  } catch {
    // Non-authoritative capture; backend stores destination at start.
  }
}

function readStoredReturnDestination() {
  try {
    return session.getItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function wirePurchaseButton() {
  const button = $w("#purchaseAbraxasButton");
  if (!button) return;

  purchaseController = createPurchaseVerificationController({
    setStatus(message) {
      const status = $w("#purchaseStatusText");
      if (status) status.text = message;
    },

    startPurchaseVerification: (returnDestinationPath) =>
      createPurchaseVerificationStart(returnDestinationPath),

    getViewMode: () => wixWindowFrontend.viewMode,

    getReturnDestination() {
      return resolvePurchaseReturnDestinationForStart({
        sessionDestination: readStoredReturnDestination(),
        queryFrom: parsePurchaseEntryFromQuery(wixLocationFrontend.query ?? {}),
        currentUrl: String(wixLocationFrontend.url || ""),
      });
    },

    storeVerifier(flowId, verifier) {
      session.setItem(`${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`, verifier);
    },

    storeFlowOwnership(flowId, ownershipSecret) {
      try {
        persistFlowOwnershipCookie((cookie) => {
          // Wix Velo browser — document.cookie assignment for first-party flow binding.
          // eslint-disable-next-line no-undef
          document.cookie = cookie;
        }, flowId, ownershipSecret);
      } catch {
        // SessionStorage verifier path remains; cookie enables same-browser cross-tab return.
      }
    },

    saveReturnDestination(destinationPath) {
      try {
        if (destinationPath) {
          session.setItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY, destinationPath);
        }
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
