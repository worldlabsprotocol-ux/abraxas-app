import assert from "node:assert/strict";
import {
  AbraxasPartnerKit,
  permitProtocolAction,
  NARROW_PARTNER_RESULT_ALLOWED_FIELDS,
} from "@abraxas/partner-kit";
import { evaluatePublicReceiptTrust } from "@abraxas/partner-kit/trust";
import { verifyPartnerWebhookEvent, WEBHOOK_SIGNATURE_HEADER } from "@abraxas/partner-kit/webhooks";

assert.equal(typeof AbraxasPartnerKit, "function");
assert.equal(typeof permitProtocolAction, "function");
assert.ok(Array.isArray(NARROW_PARTNER_RESULT_ALLOWED_FIELDS));
assert.equal(typeof evaluatePublicReceiptTrust, "function");
assert.equal(typeof verifyPartnerWebhookEvent, "function");
assert.equal(WEBHOOK_SIGNATURE_HEADER, "x-abraxas-webhook-signature");

const trust = evaluatePublicReceiptTrust(
  {
    receipt_id: "dr_fixture",
    schema_version: "1.0.0",
    partner_id: "partner-acme",
    policy_id: "partner-acme-age_21_retail-v1",
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
  },
  {
    partnerId: "partner-acme",
    policyId: "partner-acme-age_21_retail-v1",
    allowSandbox: true,
    now: new Date("2026-01-01T00:00:00.000Z"),
  },
);
assert.equal(typeof trust.currently_valid, "boolean");
assert.equal(trust.signature_valid, true);

console.log("partner-kit external consumer imports: ok");
