// FILE: examples/good-trouble-wix/backend/abraxasVerification.web.js
// Wix Velo web methods — Permissions.Anyone; Abraxas Passport is the visible gate.

import { Permissions, webMethod } from "wix-web-module";
import {
  completeAbraxasVerificationService,
  createAbraxasVerificationStartService,
} from "./abraxasVerificationService.js";

/**
 * Start Abraxas verification — no client parameters.
 * Server-owned CAPTCHA bypass; capacity and lifecycle controls protect the endpoint.
 */
export const createAbraxasVerificationStart = webMethod(
  Permissions.Anyone,
  async () =>
    createAbraxasVerificationStartService(null, {
      skipCaptcha: true,
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
