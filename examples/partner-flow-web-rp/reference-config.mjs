/**
 * Environment-driven reference relying-party config for Partner Flow examples.
 * No Good Trouble defaults — set your operator-provisioned ids explicitly.
 */

const CANONICAL_HOST = "https://abraxasworld.xyz";

export function loadReferenceConfig(env = process.env) {
  const partnerId = env.PARTNER_FLOW_RP_PARTNER_ID?.trim();
  const policyId = env.PARTNER_FLOW_RP_POLICY_ID?.trim();
  const returnUrl = env.PARTNER_FLOW_RP_RETURN_URL?.trim();
  const baseUrl = (env.PARTNER_FLOW_RP_BASE_URL?.trim() || CANONICAL_HOST).replace(/\/$/, "");
  const displayName = env.PARTNER_FLOW_RP_DISPLAY_NAME?.trim() || `Partner ${partnerId ?? ""}`;

  const missing = [];
  if (!partnerId) missing.push("PARTNER_FLOW_RP_PARTNER_ID");
  if (!policyId) missing.push("PARTNER_FLOW_RP_POLICY_ID");
  if (!returnUrl) missing.push("PARTNER_FLOW_RP_RETURN_URL");

  return {
    ok: missing.length === 0,
    missing,
    config: missing.length === 0
      ? { partnerId, policyId, returnUrl, baseUrl, displayName }
      : null,
  };
}

export function buildVerifyUrl(config) {
  const params = new URLSearchParams({
    partner_id: config.partnerId,
    policy_id: config.policyId,
    return_url: config.returnUrl,
  });
  return `${config.baseUrl}/partner/verify?${params.toString()}`;
}
