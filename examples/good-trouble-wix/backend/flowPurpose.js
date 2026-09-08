// FILE: examples/good-trouble-wix/backend/flowPurpose.js
// Explicit browse (L0) vs purchase (L2+) verification lifecycles.

import {
  BROWSE_POLICY_ID,
  BROWSE_RETURN_URL_BASE,
  FLOW_ID_PREFIX_BROWSE,
  FLOW_ID_PREFIX_PURCHASE,
  GTB_PARAM,
  GTV_PARAM,
  PARTNER_ID,
  POLICY_ID,
  PURCHASE_RETURN_URL_BASE,
} from "./constants.js";

/** @typedef {"browse" | "purchase"} FlowPurpose */

/**
 * @typedef {object} FlowPurposeConfig
 * @property {FlowPurpose} purpose
 * @property {string} policyId
 * @property {string} partnerId
 * @property {string} returnUrlBase
 * @property {string} flowIdPrefix
 * @property {string} callbackParam
 * @property {string} assuranceLabel
 */

export const BROWSE_FLOW = {
  purpose: "browse",
  policyId: BROWSE_POLICY_ID,
  partnerId: PARTNER_ID,
  returnUrlBase: BROWSE_RETURN_URL_BASE,
  flowIdPrefix: FLOW_ID_PREFIX_BROWSE,
  callbackParam: GTB_PARAM,
  assuranceLabel: "L0",
};

export const PURCHASE_FLOW = {
  purpose: "purchase",
  policyId: POLICY_ID,
  partnerId: PARTNER_ID,
  returnUrlBase: PURCHASE_RETURN_URL_BASE,
  flowIdPrefix: FLOW_ID_PREFIX_PURCHASE,
  callbackParam: GTV_PARAM,
  assuranceLabel: "L2+",
};

/** @param {unknown} purpose */
export function resolveFlowPurposeConfig(purpose) {
  const value = typeof purpose === "string" ? purpose.trim().toLowerCase() : "";
  if (value === "browse") return BROWSE_FLOW;
  if (value === "purchase") return PURCHASE_FLOW;
  return null;
}

/**
 * @param {FlowPurposeConfig} config
 * @param {string} flowId
 */
export function buildPartnerVerifyUrl(config, flowId) {
  const returnUrl = `${config.returnUrlBase}?${config.callbackParam}=${encodeURIComponent(flowId)}`;
  const search = new URLSearchParams({
    partner_id: config.partnerId,
    policy_id: config.policyId,
    return_url: returnUrl,
  });
  if (config.purpose === "browse") {
    search.set("purpose", "browse");
  }
  return `https://abraxasworld.xyz/partner/verify?${search.toString()}`;
}
