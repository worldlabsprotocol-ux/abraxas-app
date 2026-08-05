#!/usr/bin/env node
/**
 * Print a Partner Flow verify URL from environment-driven reference config.
 *
 * Usage:
 *   PARTNER_FLOW_RP_PARTNER_ID=your-protocol \
 *   PARTNER_FLOW_RP_POLICY_ID=your-policy-v1 \
 *   PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \
 *   node examples/partner-flow-web-rp/build-verify-url.mjs
 */

import { buildVerifyUrl, loadReferenceConfig } from "./reference-config.mjs";

const { ok, missing, config } = loadReferenceConfig();

if (!ok) {
  console.error("Missing required environment variables:", missing.join(", "));
  process.exit(1);
}

console.log(buildVerifyUrl(config));
