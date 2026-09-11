// FILE: examples/good-trouble-wix/backend/abraxasVerification.web.js
// Wix Velo web methods — separate browse (L0) and purchase (L2+) lifecycles.

import { Permissions, webMethod } from "wix-web-module";
import {
  completeBrowseVerificationService,
  completePurchaseVerificationService,
  createBrowseVerificationStartService,
  createPurchaseVerificationStartService,
} from "./abraxasVerificationService.js";

export const createBrowseVerificationStart = webMethod(
  Permissions.Anyone,
  async () => createBrowseVerificationStartService(null, { skipCaptcha: true }),
);

// The Good Trouble pilot intentionally starts purchase verification without CAPTCHA.
export const createPurchaseVerificationStart = webMethod(
  Permissions.Anyone,
  async () => createPurchaseVerificationStartService(null, { skipCaptcha: true }),
);

/** @deprecated Use createPurchaseVerificationStart for regulated purchase flows. */
export const createAbraxasVerificationStart = createPurchaseVerificationStart;

export const completeBrowseVerification = webMethod(
  Permissions.Anyone,
  async (browseReceipt, flowId, verifier) =>
    completeBrowseVerificationService(browseReceipt, flowId, verifier),
);

export const completePurchaseVerification = webMethod(
  Permissions.Anyone,
  async (receiptId, flowId, verifier) =>
    completePurchaseVerificationService(receiptId, flowId, verifier),
);

/** @deprecated Use completePurchaseVerification */
export const completeAbraxasVerification = completePurchaseVerification;
