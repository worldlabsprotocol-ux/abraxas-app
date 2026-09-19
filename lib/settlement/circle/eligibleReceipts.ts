// FILE: lib/settlement/circle/eligibleReceipts.ts
// Partner-scoped settlement-eligible receipts. Public list never includes receipt ids.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { CIRCLE_DEMO_AMOUNT_MINOR, CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import { gateSettlementReceipt } from "@/lib/settlement/circle/receiptGate";
import { listIntentsForApplication } from "@/lib/settlement/circle/store";
import {
  signEligibleReceiptSelection,
} from "@/lib/settlement/circle/eligibleReceiptSelection";

export type EligibleSettlementReceiptView = {
  selection_token: string;
  decision_state: "approved";
  issued_at: string;
  policy_version: number;
  environment: "sandbox";
  eligibility_summary: string;
  amount_minor: number;
  network: typeof CIRCLE_NETWORK;
  currency: typeof CIRCLE_CURRENCY;
};

const ELIGIBILITY_SUMMARY =
  "Sandbox product eligibility. Not identity verification. Not usable in Production.";

type ReceiptListRow = {
  id: string;
  evaluated_at: string;
  policy_version: number;
};

export async function listEligibleSettlementReceipts(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  sessionKeyId: string;
}): Promise<EligibleSettlementReceiptView[]> {
  if (input.application.environment !== "sandbox") return [];
  const sb = requireSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from("decision_receipts")
    .select("id, evaluated_at, policy_version")
    .eq("partner_id", input.partnerId)
    .eq("policy_id", input.application.policy_id)
    .eq("policy_version", input.application.policy_version)
    .eq("decision_result", "approved")
    .eq("status", "active")
    .eq("decision_context", "sandbox_only")
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("evaluated_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];

  const intents = await listIntentsForApplication({
    applicationId: input.application.id,
    partnerId: input.partnerId,
  });
  const used = new Set(intents.map((row) => row.receipt_id));

  const out: EligibleSettlementReceiptView[] = [];
  for (const row of data as ReceiptListRow[]) {
    if (used.has(row.id)) continue;
    const gated = await gateSettlementReceipt({
      receiptId: row.id,
      partnerId: input.partnerId,
      policyId: input.application.policy_id,
      policyVersion: input.application.policy_version,
    });
    if (!gated.ok) continue;
    const token = await signEligibleReceiptSelection({
      receiptId: row.id,
      partnerId: input.partnerId,
      applicationId: input.application.id,
      policyId: input.application.policy_id,
      policyVersion: input.application.policy_version,
      sessionKeyId: input.sessionKeyId,
    });
    if (!token) continue;
    out.push({
      selection_token: token,
      decision_state: "approved",
      issued_at: row.evaluated_at,
      policy_version: row.policy_version,
      environment: "sandbox",
      eligibility_summary: ELIGIBILITY_SUMMARY,
      amount_minor: CIRCLE_DEMO_AMOUNT_MINOR,
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
    });
  }
  return out;
}

export function eligibleReceiptListHasForbiddenMaterial(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  const needles = [
    "receipt_id",
    "subject",
    "signature",
    "wallet",
    "sui_address",
    "email",
    "date_of_birth",
    "legal_name",
    "claim_value",
    "evaluated_claim_refs",
    "payload_hash",
    "pseudonym",
  ];
  return needles.some((needle) => blob.includes(needle));
}
