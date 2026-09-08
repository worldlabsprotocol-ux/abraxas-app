// FILE: examples/good-trouble-wix/backend/browseReceiptRemoteValidator.js
// Server-side browse receipt validation via Abraxas — Wix never sees DOB.

import { ABRAXAS_ORIGIN, BROWSE_POLICY_ID, PARTNER_ID } from "./constants.js";
import { validateBrowseAccessPayload } from "./browseReceiptValidator.js";

/**
 * @param {string} browseReceiptJwt
 * @param {{ fetchImpl?: typeof fetch, now?: Date }} [opts]
 * @returns {Promise<{ verified: boolean, transientFailure?: boolean, payload?: object }>}
 */
export async function verifyBrowseReceiptRemotely(browseReceiptJwt, opts = {}) {
  const token = typeof browseReceiptJwt === "string" ? browseReceiptJwt.trim() : "";
  if (!token || token.length > 8192) {
    return { verified: false, transientFailure: false };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  let response;
  try {
    response = await fetchImpl(`${ABRAXAS_ORIGIN}/api/age-assurance/browse-receipt/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        browse_receipt: token,
        partner_id: PARTNER_ID,
        policy_id: BROWSE_POLICY_ID,
      }),
    });
  } catch {
    return { verified: false, transientFailure: true };
  }

  if (!response.ok) {
    return { verified: false, transientFailure: response.status >= 500 };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { verified: false, transientFailure: false };
  }

  if (!body?.verified) {
    return { verified: false, transientFailure: false };
  }

  const payload = {
    artifact_type: "browse_access_receipt",
    valid_for_purchase: false,
    purpose: "browse",
    assurance_level: "L0",
    partner_id: PARTNER_ID,
    policy_id: BROWSE_POLICY_ID,
    expires_at: body.expires_at,
    age_band: body.age_band,
  };

  const local = validateBrowseAccessPayload(payload, { now: opts.now });
  return local.verified
    ? { verified: true, transientFailure: false, payload }
    : { verified: false, transientFailure: false };
}
