// FILE: examples/good-trouble-wix/backend/abraxasVerification.web.js
// Good Trouble Canna — Wix Velo backend reference for Abraxas Passport sandbox verification.
// No API key required for redirect or public receipt fetch.

import { currentMember } from "wix-members-backend";
import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
} from "./nonceLifecycle.js";
import { createWixNonceStore } from "./wixNonceStore.js";

/**
 * Configure wix-crypto sha256 for production Wix deployment:
 *   import { sha256 } from "wix-crypto";
 *   const hashFn = (value) => sha256(value);
 */
async function sha256Hex(value) {
  throw new Error("Configure wix-crypto sha256 for production Wix deployment");
}

function trustedMemberContext() {
  const member = currentMember;
  return { memberId: member?.id ?? null };
}

/**
 * Start Abraxas verification — session binding derived from Wix Members backend only.
 * Anonymous visitors receive { error: "anonymous_session_unsupported" }.
 */
export async function createAbraxasVerificationStart() {
  const trusted = trustedMemberContext();
  if (!trusted.memberId) {
    return { error: "anonymous_session_unsupported" };
  }

  const store = createWixNonceStore();
  const payload = await buildVerificationStartPayload({
    sessionBinding: `member:${trusted.memberId.trim()}`,
    hashFn: sha256Hex,
  });

  await store.insert(payload.nonceRecord);
  return { verifyUrl: payload.verifyUrl };
}

/**
 * Handle age-verification-result callback — server-side only.
 * Never accept a frontend-supplied visitorId; binding comes from currentMember.
 *
 * @param {string} receiptId from callback query
 * @param {string} gtvNonce raw nonce from callback query (gtv param only)
 */
export async function completeAbraxasVerification(receiptId, gtvNonce) {
  const store = createWixNonceStore();
  return completeAbraxasVerificationCore({
    store,
    trustedBackendContext: trustedMemberContext(),
    receiptId,
    rawNonce: gtvNonce,
    hashFn: sha256Hex,
    validateReceipt: async (id) => {
      try {
        const result = await fetchAndValidateSandboxReceipt(id);
        return { verified: result.verified, transientFailure: false };
      } catch {
        return { verified: false, transientFailure: true };
      }
    },
  });
}
