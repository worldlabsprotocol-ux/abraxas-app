#!/usr/bin/env node
/**
 * Partner Flow callback receipt verifier (standalone — no API key).
 *
 * Usage:
 *   node verify-callback.mjs \
 *     --receipt-id dr_abc123 \
 *     --partner-id your-partner-id \
 *     --policy-id your-policy-v1
 *
 * Canonical host: https://abraxasworld.xyz
 * Keep validation rules in sync with lib/partner/verifyPartnerFlowReceipt.ts
 */

const CANONICAL_HOST = "https://abraxasworld.xyz";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--receipt-id") args.receiptId = value;
    if (key === "--partner-id") args.partnerId = value;
    if (key === "--policy-id") args.policyId = value;
    if (key === "--base-url") args.baseUrl = value;
  }
  return args;
}

function validateReceipt(receipt, expected, now = new Date()) {
  const errors = [];

  if (!receipt || typeof receipt !== "object") {
    return { ok: false, errors: ["receipt_missing"] };
  }

  if (receipt.signature_valid !== true) {
    errors.push("signature_invalid");
  }

  if (receipt.decision_result !== "approved") {
    errors.push(`decision_not_approved:${receipt.decision_result ?? "missing"}`);
  }

  if (receipt.partner_id !== expected.partnerId) {
    errors.push(`partner_mismatch:expected=${expected.partnerId},got=${receipt.partner_id ?? "missing"}`);
  }

  if (receipt.policy_id !== expected.policyId) {
    errors.push(`policy_mismatch:expected=${expected.policyId},got=${receipt.policy_id ?? "missing"}`);
  }

  if (receipt.expires_at) {
    const expiresAt = new Date(receipt.expires_at);
    if (Number.isNaN(expiresAt.getTime())) {
      errors.push("expires_at_invalid");
    } else if (expiresAt.getTime() <= now.getTime()) {
      errors.push("receipt_expired");
    }
  }

  if (receipt.status && receipt.status !== "active") {
    errors.push(`status_not_active:${receipt.status}`);
  }

  return { ok: errors.length === 0, errors };
}

async function main() {
  const { receiptId, partnerId, policyId, baseUrl } = parseArgs(process.argv);

  if (!receiptId || !partnerId || !policyId) {
    console.error("Usage: node verify-callback.mjs --receipt-id dr_… --partner-id … --policy-id …");
    process.exit(1);
  }

  const host = (baseUrl ?? CANONICAL_HOST).replace(/\/$/, "");
  if (host !== CANONICAL_HOST) {
    console.warn(`Warning: non-canonical host ${host}; production integrations should use ${CANONICAL_HOST}.`);
  }

  const url = `${host}/api/receipts/${encodeURIComponent(receiptId)}/public`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Receipt fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }

  const receipt = await res.json();
  const result = validateReceipt(receipt, { partnerId, policyId });

  if (!result.ok) {
    console.error("Receipt validation failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("Receipt verified:");
  console.log(`  receipt_id: ${receipt.receipt_id}`);
  console.log(`  partner_id: ${receipt.partner_id}`);
  console.log(`  policy_id: ${receipt.policy_id}`);
  console.log(`  expires_at: ${receipt.expires_at ?? "(none)"}`);
  console.log(`  signature_valid: ${receipt.signature_valid}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
