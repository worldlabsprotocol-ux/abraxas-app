// FILE: examples/partner-access-nextjs-starter/lib/verifyReceipt.ts
// Server-side public receipt fetch + fail-closed validation.

import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import type { ReferenceRelyingPartyConfig } from "@/lib/partner/referenceRelyingPartyConfig";

export interface VerifyReceiptInput {
  receiptId: string;
  config: ReferenceRelyingPartyConfig;
  allowSandbox: boolean;
  fetchFn?: typeof fetch;
}

export interface VerifyReceiptResult {
  ok: boolean;
  receipt: PartnerFlowPublicReceipt | null;
  errors: string[];
}

export async function fetchPublicReceipt(
  receiptId: string,
  abraxasBaseUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<PartnerFlowPublicReceipt | null> {
  const base = abraxasBaseUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/api/receipts/${encodeURIComponent(receiptId)}/public`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as PartnerFlowPublicReceipt;
}

export async function verifyReceiptServerSide(
  input: VerifyReceiptInput,
): Promise<VerifyReceiptResult> {
  const receipt = await fetchPublicReceipt(
    input.receiptId,
    input.config.baseUrl,
    input.fetchFn,
  );

  if (!receipt) {
    return { ok: false, receipt: null, errors: ["receipt_not_found"] };
  }

  const validation = validatePartnerFlowPublicReceipt(receipt, {
    partnerId: input.config.partnerId,
    policyId: input.config.policyId,
    allowSandbox: input.allowSandbox,
  });

  return {
    ok: validation.ok,
    receipt,
    errors: validation.errors,
  };
}

/** Safe fields only — never identity claims, email, wallet, or documents. */
export function publicAccessSummary(receipt: PartnerFlowPublicReceipt): Record<string, string> {
  return {
    receipt_id: receipt.receipt_id ?? "",
    partner_id: receipt.partner_id ?? "",
    policy_id: receipt.policy_id ?? "",
    status: receipt.status ?? "",
    expires_at: receipt.expires_at ?? "",
  };
}
