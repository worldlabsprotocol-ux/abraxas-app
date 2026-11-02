// FILE: lib/passport/verificationActivity/withdraw.ts
// Holder-owned withdrawal of a current shared result. Session subject is the only authority.

import { createHash } from "node:crypto";
import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg, withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { appendAuditEvent } from "@/lib/verification/audit";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { revokeDecisionReceiptControlled } from "@/lib/decisionReceipts/revocationControlPlane";
import { revokeDerivedFromSourceReceipt } from "@/lib/passport/reusableEligibility/store";
import { enqueueDerivedInvalidationEvents } from "@/lib/partner/receiptLifecycle";
import { applyDisclosureProfile } from "@/lib/privacy/selectiveDisclosure/enforce";
import { rejectClientDisclosureConfig } from "@/lib/privacy/selectiveDisclosure/clientOverride";
import { GENERIC_MINIMAL_PROFILE } from "@/lib/privacy/selectiveDisclosure/profiles";
import { buildPartnerWebhookPayload } from "@/lib/partner/webhooks/webhookPayloadContract";
import {
  HOLDER_WITHDRAWAL_REASON_CODE,
  PASSPORT_ACTIVITY_STATE_LABELS,
  PASSPORT_ACTIVITY_WITHDRAW_CLIENT_KEYS,
  PASSPORT_ACTIVITY_WITHDRAW_NOT_CURRENT,
  PASSPORT_ACTIVITY_WITHDRAW_NOT_FOUND,
  PASSPORT_ACTIVITY_WITHDRAW_SUCCESS,
  PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE,
  PASSPORT_ACTIVITY_WINDOW_DAYS,
} from "./contract";
import {
  isOpaqueActivityRef,
  opaqueActivityRef,
  passportActivityCopyLeaks,
  resolvePassportActivityState,
  type PassportActivitySourceRow,
} from "./view";

const HOLDER_WITHDRAWAL_AUTHORITY_KEYS = [
  "subject",
  "subject_id",
  "sui",
  "sui_address",
  "partner",
  "partner_id",
  "policy",
  "policy_id",
  "policy_version",
  "decision",
  "decision_id",
  "receipt",
  "receipt_id",
  "status",
  "callback",
  "action",
  "wallet",
  "wallet_address",
  "key",
  "api_key",
  "production",
  "environment",
] as const;

export type HolderWithdrawErrorCode =
  | "sign_in_required"
  | "invalid_activity_ref"
  | "client_override_rejected"
  | "not_found"
  | "result_not_current"
  | "unavailable";

export type HolderWithdrawClientView = {
  ok: true;
  state: "revoked";
  state_label: string;
  already_withdrawn: boolean;
  next_step: string;
};

export function rejectHolderWithdrawalClientAuthority(body: unknown):
  | { ok: true }
  | { ok: false; error: HolderWithdrawErrorCode } {
  const disclosure = rejectClientDisclosureConfig(body);
  if (!disclosure.ok) return { ok: false, error: "client_override_rejected" };
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_activity_ref" };
  }
  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.some((key) => (HOLDER_WITHDRAWAL_AUTHORITY_KEYS as readonly string[]).includes(key))) {
    return { ok: false, error: "client_override_rejected" };
  }
  return { ok: true };
}

export function holderWithdrawalClientError(code: HolderWithdrawErrorCode): { ok: false; error: string } {
  switch (code) {
    case "sign_in_required":
      return { ok: false, error: "Sign in required" };
    case "invalid_activity_ref":
      return { ok: false, error: "Choose a verification activity from Passport." };
    case "client_override_rejected":
      return { ok: false, error: "disclosure_rejected" };
    case "not_found":
      return { ok: false, error: PASSPORT_ACTIVITY_WITHDRAW_NOT_FOUND };
    case "result_not_current":
      return { ok: false, error: PASSPORT_ACTIVITY_WITHDRAW_NOT_CURRENT };
    default:
      return { ok: false, error: PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE };
  }
}

export function projectHolderWithdrawalClientView(alreadyWithdrawn: boolean): HolderWithdrawClientView {
  const view: HolderWithdrawClientView = {
    ok: true,
    state: "revoked",
    state_label: PASSPORT_ACTIVITY_STATE_LABELS.revoked,
    already_withdrawn: alreadyWithdrawn,
    next_step: PASSPORT_ACTIVITY_WITHDRAW_SUCCESS,
  };
  return view;
}

export function holderRevocationEventPreview(input: {
  eventId: string;
  occurredAt: string;
  partnerId: string;
  policyId?: string | null;
  policyVersion?: number | null;
  receiptId?: string | null;
  decisionId?: string | null;
}): Record<string, unknown> | null {
  const raw = buildPartnerWebhookPayload({
    eventId: input.eventId,
    eventType: "partner.receipt.revoked",
    occurredAt: input.occurredAt,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    receiptId: input.receiptId,
    decisionId: input.decisionId,
    reasonCode: HOLDER_WITHDRAWAL_REASON_CODE,
    outcome: "revoked",
  });
  const sealed = applyDisclosureProfile(raw, GENERIC_MINIMAL_PROFILE, "webhook_event");
  return sealed.ok ? sealed.payload : null;
}

function thenableError(message: string): never {
  throw new Error(message);
}

interface HolderActivityMatch {
  activity_ref: string;
  decision_id: string;
  receipt_id: string | null;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  source: PassportActivitySourceRow;
}

async function listHolderActivityMatches(subjectId: string): Promise<HolderActivityMatch[]> {
  if (persistenceUsesDirectPostgres()) {
    const since = new Date(Date.now() - PASSPORT_ACTIVITY_WINDOW_DAYS * 86400_000).toISOString();
    const { rows } = await queryAbraxasPg<{
      decision_id: string; receipt_id: string | null; partner_id: string; policy_id: string;
      policy_version: number; decision: string; decided_at: string; valid_until: string | null;
      decision_status: string; receipt_status: string | null; receipt_context: string | null;
      receipt_expires_at: string | null; receipt_revoked_at: string | null;
    }>(
      `select d.id::text as decision_id, c.id as receipt_id, d.partner_id, d.policy_id,
              d.policy_version, d.decision, d.decided_at::text, d.valid_until::text,
              d.status as decision_status, c.status as receipt_status,
              c.decision_context as receipt_context, c.expires_at::text as receipt_expires_at,
              c.revoked_at::text as receipt_revoked_at
       from public.verification_decisions d
       left join lateral (
         select id, status, decision_context, expires_at, revoked_at
         from public.decision_receipts where verification_decision_id = d.id
         order by created_at desc limit 1
       ) c on true
       where d.subject_id = $1 and d.decided_at >= $2::timestamptz
       order by d.decided_at desc limit 80`,
      [subjectId, since],
    );
    return rows.map((row) => ({
      activity_ref: opaqueActivityRef(subjectId, row.decision_id),
      decision_id: row.decision_id,
      receipt_id: row.receipt_id,
      partner_id: row.partner_id,
      policy_id: row.policy_id,
      policy_version: row.policy_version,
      source: {
        decision_id: row.decision_id, partner_id: row.partner_id,
        policy_id: row.policy_id, policy_version: row.policy_version,
        decision: row.decision, decided_at: row.decided_at, valid_until: row.valid_until,
        decision_status: row.decision_status, requested_action: null,
        receipt_status: row.receipt_status, receipt_context: row.receipt_context,
        receipt_expires_at: row.receipt_expires_at, receipt_revoked_at: row.receipt_revoked_at,
      },
    }));
  }
  const sb = requireSupabaseAdmin();
  const since = new Date(Date.now() - PASSPORT_ACTIVITY_WINDOW_DAYS * 86400_000).toISOString();
  const { data: decisions, error } = await sb
    .from("verification_decisions")
    .select("id, partner_id, policy_id, policy_version, decision, decided_at, valid_until, status, request_id")
    .eq("subject_id", subjectId)
    .gte("decided_at", since)
    .order("decided_at", { ascending: false })
    .limit(80);

  if (error) thenableError("unavailable");

  const rows = (decisions ?? []) as Array<Record<string, unknown>>;
  const decisionIds = rows.map((row) => String(row.id ?? "")).filter(Boolean);

  const receiptsByDecision = new Map<string, Record<string, unknown>>();
  if (decisionIds.length) {
    const { data: receipts, error: receiptError } = await sb
      .from("decision_receipts")
      .select("id, verification_decision_id, status, decision_context, expires_at, revoked_at")
      .in("verification_decision_id", decisionIds);
    if (receiptError) thenableError("unavailable");
    for (const receipt of receipts ?? []) {
      const rec = receipt as Record<string, unknown>;
      const key = String(rec.verification_decision_id ?? "");
      if (key) receiptsByDecision.set(key, rec);
    }
  }

  return rows.map((row) => {
    const decisionId = String(row.id ?? "");
    const receipt = receiptsByDecision.get(decisionId);
    const source: PassportActivitySourceRow = {
      decision_id: decisionId,
      partner_id: String(row.partner_id ?? ""),
      policy_id: String(row.policy_id ?? ""),
      policy_version: Number(row.policy_version ?? 1),
      decision: String(row.decision ?? ""),
      decided_at: String(row.decided_at ?? ""),
      valid_until: (row.valid_until as string | null) ?? null,
      decision_status: String(row.status ?? "active"),
      requested_action: null,
      receipt_status: receipt ? String(receipt.status ?? "") : null,
      receipt_context: receipt ? String(receipt.decision_context ?? "") : null,
      receipt_expires_at: receipt ? ((receipt.expires_at as string | null) ?? null) : null,
      receipt_revoked_at: receipt ? ((receipt.revoked_at as string | null) ?? null) : null,
    };
    return {
      activity_ref: opaqueActivityRef(subjectId, decisionId),
      decision_id: decisionId,
      receipt_id: receipt ? String(receipt.id ?? "") || null : null,
      partner_id: source.partner_id,
      policy_id: source.policy_id,
      policy_version: source.policy_version,
      source,
    };
  });
}

async function withdrawOnSovereignPostgres(
  subjectId: string,
  match: HolderActivityMatch,
): Promise<{ ok: true; view: HolderWithdrawClientView } | { ok: false; error: HolderWithdrawErrorCode; status: number }> {
  if (!match.receipt_id) return { ok: false, error: "unavailable", status: 503 };
  const pseudonym = subjectPseudonymId(subjectId);
  return withAbraxasPgTransaction(async (client) => {
    const revokeAuthorization = async (receiptId: string) => {
      await client.query(
        `update public.verification_decisions d set status = 'revoked'
         from public.decision_receipts r
         where r.id = $1 and d.id = r.verification_decision_id
           and d.subject_id = $2 and d.status = 'active'`,
        [receiptId, subjectId],
      );
      await client.query(
        `update public.consent_receipts c
         set revoked_at = coalesce(c.revoked_at, now())
         from public.decision_receipts r
         where r.id = $1 and c.id = r.consent_receipt_id
           and c.subject_id = $2`,
        [receiptId, subjectId],
      );
    };
    const bound = await client.query<{ id: string; status: string; revoked_at: string | null }>(
      `select c.id, c.status, c.revoked_at::text from public.verification_decisions d
       join public.decision_receipts c on c.verification_decision_id = d.id
       where d.id = $1::uuid and d.subject_id = $2 and c.id = $3
         and c.subject_pseudonym_id = $4 and c.partner_id = d.partner_id
         and c.policy_id = d.policy_id and c.policy_version = d.policy_version
       for update of d, c`,
      [match.decision_id, subjectId, match.receipt_id, pseudonym],
    );
    const receipt = bound.rows[0];
    if (!receipt) return { ok: false as const, error: "not_found" as const, status: 404 };
    const alreadyWithdrawn = receipt.status === "revoked" || receipt.revoked_at !== null;
    if (!alreadyWithdrawn && receipt.status !== "active") {
      return { ok: false as const, error: "result_not_current" as const, status: 409 };
    }
    if (!alreadyWithdrawn) {
      const revoked = await client.query<{ result: { ok: boolean; error?: string } }>(
        `select public.revoke_decision_receipt_atomic($1, $2, $3, $4) as result`,
        [receipt.id, HOLDER_WITHDRAWAL_REASON_CODE, `holder:${pseudonym}`,
          `holder_withdraw:${pseudonym}:${match.activity_ref}`],
      );
      if (revoked.rows[0]?.result?.ok !== true) throw new Error("receipt_revoke_failed");
    }
    await revokeAuthorization(receipt.id);

    // Revoke every descendant in the same transaction. A missing lifecycle table or
    // failed revoke rolls back the source receipt, so no partial success is shown.
    const visited = new Set<string>();
    const queue = [receipt.id];
    while (queue.length) {
      const sourceId = queue.shift()!;
      if (visited.has(sourceId)) continue;
      visited.add(sourceId);
      if (visited.size > 1000) throw new Error("derived_receipt_limit_exceeded");
      const derived = await client.query<{ derived_receipt_id: string }>(
        `select derived_receipt_id from public.reusable_eligibility_derivations
         where source_receipt_id = $1 order by derived_receipt_id`,
        [sourceId],
      );
      for (const row of derived.rows) {
        const child = await client.query<{
          status: string; revoked_at: string | null; subject_id: string;
        }>(
          `select r.status, r.revoked_at::text, d.subject_id
           from public.decision_receipts r
           join public.verification_decisions d on d.id = r.verification_decision_id
           where r.id = $1 for update of r, d`,
          [row.derived_receipt_id],
        );
        if (!child.rows[0] || child.rows[0].subject_id !== subjectId) {
          throw new Error("derived_receipt_binding_changed");
        }
        if (child.rows[0].status === "active" && !child.rows[0].revoked_at) {
          const revoked = await client.query<{ result: { ok: boolean } }>(
            `select public.revoke_decision_receipt_atomic($1, $2, $3, $4) as result`,
            [row.derived_receipt_id, HOLDER_WITHDRAWAL_REASON_CODE, `holder:${pseudonym}`,
              `derived:${sourceId}:${row.derived_receipt_id}`],
          );
          if (revoked.rows[0]?.result?.ok !== true) throw new Error("derived_receipt_revoke_failed");
        }
        await revokeAuthorization(row.derived_receipt_id);
        queue.push(row.derived_receipt_id);
      }
      await client.query(
        `update public.reusable_eligibility_facts
         set status = 'revoked', revoked_at = coalesce(revoked_at, now())
         where source_receipt_id = $1 and status <> 'revoked'`,
        [sourceId],
      );
    }
    if (!alreadyWithdrawn) {
      const metadata = { reason_code: HOLDER_WITHDRAWAL_REASON_CODE, activity_ref: match.activity_ref };
      const eventHash = createHash("sha256").update(JSON.stringify({
        actor_type: "subject", actor_id: pseudonym, action: "passport_activity.withdrawn",
        object_type: "passport_activity", object_id: match.activity_ref,
        policy_id: match.policy_id, policy_version: match.policy_version,
        metadata, ts: new Date().toISOString(),
      })).digest("hex");
      await client.query(
        `insert into public.audit_events
           (actor_type, actor_id, action, object_type, object_id, policy_id, policy_version, metadata, event_hash)
         values ('subject', $1, 'passport_activity.withdrawn', 'passport_activity', $2, $3, $4, $5::jsonb, $6)`,
        [pseudonym, match.activity_ref, match.policy_id, match.policy_version,
          JSON.stringify(metadata), eventHash],
      );
    }
    return { ok: true as const, view: projectHolderWithdrawalClientView(alreadyWithdrawn) };
  });
}

export async function withdrawHolderSharedResult(input: {
  subjectId: string;
  activityRef: unknown;
  clientBody?: unknown;
}): Promise<
  | { ok: true; view: HolderWithdrawClientView }
  | { ok: false; error: HolderWithdrawErrorCode; status: number }
> {
  const authority = rejectHolderWithdrawalClientAuthority(input.clientBody ?? { activity_ref: input.activityRef });
  if (!authority.ok) {
    return { ok: false, error: authority.error, status: 400 };
  }
  if (!isOpaqueActivityRef(input.activityRef)) {
    return { ok: false, error: "invalid_activity_ref", status: 400 };
  }

  try {
    const matches = await listHolderActivityMatches(input.subjectId);
    const match = matches.find((row) => row.activity_ref === input.activityRef);
    if (!match) {
      return { ok: false, error: "not_found", status: 404 };
    }

    const state = resolvePassportActivityState(match.source);
    if (persistenceUsesDirectPostgres()) {
      if (state !== "approved" && state !== "sandbox_only" && state !== "revoked") {
        return { ok: false, error: "result_not_current", status: 409 };
      }
      return await withdrawOnSovereignPostgres(input.subjectId, match);
    }
    if (state === "revoked") {
      if (match.receipt_id) {
        await revokeDerivedFromSourceReceipt({
          sourceReceiptId: match.receipt_id,
          changedBy: `holder:${subjectPseudonymId(input.subjectId)}`,
          reasonCode: HOLDER_WITHDRAWAL_REASON_CODE,
        });
        void enqueueDerivedInvalidationEvents(match.receipt_id);
      }
      const view = projectHolderWithdrawalClientView(true);
      return { ok: true, view };
    }
    if (state !== "approved" && state !== "sandbox_only") {
      return { ok: false, error: "result_not_current", status: 409 };
    }
    if (!match.receipt_id) {
      return { ok: false, error: "unavailable", status: 503 };
    }

    const pseudonym = subjectPseudonymId(input.subjectId);
    const result = await revokeDecisionReceiptControlled({
      receiptId: match.receipt_id,
      reasonCode: HOLDER_WITHDRAWAL_REASON_CODE,
      changedBy: `holder:${pseudonym}`,
      idempotencyKey: `holder_withdraw:${pseudonym}:${match.activity_ref}`,
      skipStandardAudit: true,
    });

    if (!result.ok) {
      if (result.error === "receipt_not_active") {
        return { ok: false, error: "result_not_current", status: 409 };
      }
      if (result.error === "receipt_not_found") {
        return { ok: false, error: "not_found", status: 404 };
      }
      return { ok: false, error: "unavailable", status: 503 };
    }

    await appendAuditEvent({
      actor_type: "subject",
      actor_id: pseudonym,
      action: "passport_activity.withdrawn",
      object_type: "passport_activity",
      object_id: match.activity_ref,
      policy_id: match.policy_id,
      policy_version: match.policy_version,
      metadata: {
        reason_code: HOLDER_WITHDRAWAL_REASON_CODE,
        activity_ref: match.activity_ref,
        already_withdrawn: result.alreadyRevoked,
      },
    });

    await revokeDerivedFromSourceReceipt({
      sourceReceiptId: match.receipt_id,
      changedBy: `holder:${pseudonym}`,
      reasonCode: HOLDER_WITHDRAWAL_REASON_CODE,
    });
    void enqueueDerivedInvalidationEvents(match.receipt_id);

    const view = projectHolderWithdrawalClientView(result.alreadyRevoked);
    const serialized = JSON.stringify(view);
    if (passportActivityCopyLeaks(serialized).length > 0) {
      return { ok: false, error: "unavailable", status: 503 };
    }
    if (Object.keys(view).sort().join() !== [...PASSPORT_ACTIVITY_WITHDRAW_CLIENT_KEYS].sort().join()) {
      return { ok: false, error: "unavailable", status: 503 };
    }
    return { ok: true, view };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, error: "unavailable", status: 503 };
    }
    return { ok: false, error: "unavailable", status: 503 };
  }
}
