// FILE: lib/demo/relyingPartyPilot/verification.ts
// Server-side partner verification for the pilot demo. Callback params are never trusted alone.

import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { PARTNER_FLOW_RECEIPT_CHECKS } from "@/lib/partner/partnerFlowIntegratorKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { RELYING_PARTY_PILOT_PACK_ID } from "./contract";
import type { RelyingPartyPilotMerchantConfig } from "./config";

export interface PilotVerificationInput {
  merchant: Pick<RelyingPartyPilotMerchantConfig, "partner_id" | "policy_id" | "policy_version">;
  receipt_id?: string;
  search_params?: Record<string, string | string[] | undefined>;
  allow_sandbox?: boolean;
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

import type { PilotVerificationCheck, PilotVerificationResult } from "./types";

export type { PilotVerificationCheck, PilotVerificationResult };

function kitFor(input: PilotVerificationInput) {
  return new AbraxasPartnerKit({
    partnerId: input.merchant.partner_id,
    policyId: input.merchant.policy_id,
    policyVersion: input.merchant.policy_version,
    requirePolicyVersion: true,
    environment: "sandbox",
    policyPackId: RELYING_PARTY_PILOT_PACK_ID,
    baseUrl: input.baseUrl,
    fetchFn: input.fetchFn,
  });
}

function buildChecks(
  receipt: PartnerFlowPublicReceipt | null,
  merchant: PilotVerificationInput["merchant"],
  allowSandbox: boolean,
  validationErrors: string[],
): PilotVerificationCheck[] {
  const validation = receipt
    ? validatePartnerFlowPublicReceipt(receipt, {
      partnerId: merchant.partner_id,
      policyId: merchant.policy_id,
      allowSandbox,
    })
    : { ok: false, errors: validationErrors };

  const rows: PilotVerificationCheck[] = PARTNER_FLOW_RECEIPT_CHECKS.map((row) => {
    let pass = false;
    if (!receipt) {
      pass = false;
    } else if (row.check.startsWith("signature_valid")) pass = receipt.signature_valid === true;
    else if (row.check.startsWith("decision_result")) pass = receipt.decision_result === "approved";
    else if (row.check.startsWith("status")) pass = receipt.status === "active";
    else if (row.check.startsWith("expires_at")) {
      pass = Boolean(receipt.expires_at && new Date(receipt.expires_at) > new Date());
    } else if (row.check.startsWith("production_usable")) {
      pass = allowSandbox ? true : receipt.production_usable === true;
    } else if (row.check.startsWith("partner_id")) {
      pass = receipt.partner_id === merchant.partner_id;
    } else if (row.check.startsWith("policy_id")) {
      pass = receipt.policy_id === merchant.policy_id;
    }
    return {
      id: row.check,
      label: row.check,
      pass,
      detail: row.why,
    };
  });
  rows.push({
    id: "validation_aggregate",
    label: "validatePartnerFlowPublicReceipt",
    pass: validation.ok,
    detail: validation.ok ? "Public receipt matches expected partner and policy." : validation.errors.join("; "),
  });
  return rows;
}

function partnerVisible(receipt: PartnerFlowPublicReceipt | null): Record<string, unknown> | null {
  if (!receipt) return null;
  return {
    result: receipt.decision_result === "approved" ? "age_eligible_21" : "not_eligible",
    policy: receipt.policy_id,
    policy_version: (receipt as PartnerFlowPublicReceipt & { policy_version?: number }).policy_version ?? null,
    partner_id: receipt.partner_id,
    receipt_id: receipt.receipt_id,
    issued_at: (receipt as PartnerFlowPublicReceipt & { issued_at?: string }).issued_at ?? null,
    expires_at: receipt.expires_at,
    currently_valid: receipt.currently_valid,
    signature_valid: receipt.signature_valid,
    status: receipt.status,
  };
}

export async function verifyPilotPartnerReceipt(input: PilotVerificationInput): Promise<PilotVerificationResult> {
  const kit = kitFor(input);
  const allowSandbox = input.allow_sandbox !== false;

  let safe;
  if (input.search_params && Object.keys(input.search_params).length > 0) {
    safe = await kit.verifyCallback(input.search_params);
  } else if (input.receipt_id?.trim()) {
    safe = await kit.verifyReceiptId(input.receipt_id.trim());
  } else {
    return {
      allowed: false,
      outcome: "invalid",
      reason_codes: ["missing_receipt_id"],
      checks: buildChecks(null, input.merchant, allowSandbox, ["missing_receipt_id"]),
      receipt: null,
      partner_visible: null,
      cryptographically_verified: false,
    };
  }

  const fetched = safe.receipt_id
    ? await kit.fetchPublicReceipt(safe.receipt_id)
    : { ok: false as const, errors: safe.errors };
  const receipt = fetched.ok ? fetched.receipt : null;
  const checks = buildChecks(receipt, input.merchant, allowSandbox, safe.errors);
  const allowed = permitProtocolAction(safe) && checks.every((check) => check.pass);

  return {
    allowed,
    outcome: safe.outcome,
    reason_codes: safe.errors,
    checks,
    receipt,
    partner_visible: partnerVisible(receipt),
    cryptographically_verified: Boolean(receipt?.signature_valid),
  };
}
