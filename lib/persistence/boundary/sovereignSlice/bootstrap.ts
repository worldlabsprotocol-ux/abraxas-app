// FILE: lib/persistence/boundary/sovereignSlice/bootstrap.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildPartnerFlowReceiptMeteringKey } from "@/lib/partner/partnerMetering";
import { assertSovereignStagingWriteAllowed } from "../isolationGuard";

const SCHEMA_PATH = join(process.cwd(), "lib/persistence/boundary/sovereignSlice/schema.sql");

export async function applySovereignSliceSchema(pool: Pool): Promise<void> {
  const sql = readFileSync(SCHEMA_PATH, "utf8");
  await pool.query(sql);
}

export async function seedSovereignSliceFixtures(input: {
  pool: Pool;
  record: DecisionReceiptRecord;
  env?: Record<string, string | undefined>;
}): Promise<void> {
  assertSovereignStagingWriteAllowed(input.env ?? process.env);
  const r = input.record;
  await input.pool.query(
    `insert into public.partners (partner_id, status) values ($1, 'active')
     on conflict (partner_id) do nothing`,
    [r.partner_id],
  );
  await input.pool.query(
    `insert into public.issuer_signing_keys (signing_key_id, status) values ($1, 'active')
     on conflict (signing_key_id) do nothing`,
    [r.signing_key_id],
  );
  await input.pool.query(
    `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
     values ($1, $2, $3, 'sovereign-slice', '{}', 'active')
     on conflict (id, version) do nothing`,
    [r.policy_id, r.partner_id, r.policy_version],
  );
  await input.pool.query(
    `insert into public.decision_receipts (
       id, verification_decision_id, consent_receipt_id, partner_id, policy_id, policy_version,
       subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes, evaluated_claim_refs,
       issuer_refs, decision_context, evaluated_at, expires_at, revoked_at, status, schema_version,
       payload_hash, signature, signing_key_id, created_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
     )
     on conflict (id) do nothing`,
    [
      r.id,
      r.verification_decision_id,
      r.consent_receipt_id,
      r.partner_id,
      r.policy_id,
      r.policy_version,
      r.subject_pseudonym_id,
      r.wallet_binding_ref,
      r.decision_result,
      r.reason_codes,
      JSON.stringify(r.evaluated_claim_refs),
      r.issuer_refs,
      r.decision_context,
      r.evaluated_at,
      r.expires_at,
      r.revoked_at,
      r.status,
      r.schema_version,
      r.payload_hash,
      r.signature,
      r.signing_key_id,
      r.created_at,
    ],
  );
  const meteringKey = buildPartnerFlowReceiptMeteringKey(r.id);
  await input.pool.query(
    `insert into public.partner_metering_events (
       partner_id, event_type, idempotency_key, receipt_id, policy_id, decision_id
     ) values ($1, 'partner_flow_receipt_issued', $2, $3, $4, $5)
     on conflict (idempotency_key) do nothing`,
    [r.partner_id, meteringKey, r.id, r.policy_id, r.verification_decision_id],
  );
}

export async function truncateSovereignSlice(pool: Pool): Promise<void> {
  await pool.query(`
    truncate public.partner_metering_events,
             public.decision_receipts,
             public.partner_policies,
             public.issuer_signing_keys,
             public.partners
    restart identity cascade
  `);
}
