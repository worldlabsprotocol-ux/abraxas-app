// FILE: examples/good-trouble-wix/backend/abraxasVerification.web.js
// Wix Velo web methods — Permissions.Anyone with server-side CAPTCHA authorization.

import { Permissions, webMethod } from "wix-web-module";
import wixCaptcha from "wix-captcha-backend";
import {
  completeAbraxasVerificationService,
  createAbraxasVerificationStartService,
} from "./abraxasVerificationService.js";

/**
 * Start Abraxas verification after Wix reCAPTCHA backend authorization.
 * @param {string} captchaToken from `#abraxasCaptcha` element getToken()
 */
export const createAbraxasVerificationStart = webMethod(
  Permissions.Anyone,
  async (captchaToken) => createAbraxasVerificationStartService(captchaToken, {
    authorizeCaptcha: (token) => wixCaptcha.authorize(token),
  }),
);

/**
 * Complete Abraxas callback — PKCE verifier required from sessionStorage.
 */
export const completeAbraxasVerification = webMethod(
  Permissions.Anyone,
  async (receiptId, flowId, verifier) => completeAbraxasVerificationService(
    receiptId,
    flowId,
    verifier,
  ),
);
