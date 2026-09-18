// FILE: lib/settlement/circle/execute.ts
// Settlement state machine. Intents stay pending until a sealed Circle result arrives.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { parseAmountMinor } from "@/lib/settlement/circle/amount";
import {
  isCircleAuthenticatedResult,
  toSettledState,
  type CircleAuthenticatedResult,
} from "@/lib/settlement/circle/authenticated";
import {
  probeCircleAvailability,
  type CircleAvailability,
} from "@/lib/settlement/circle/availability";
import { CIRCLE_PUBLIC_CODES, type CirclePublicCode } from "@/lib/settlement/circle/codes";
import { createCircleWalletsPortFromEnv } from "@/lib/settlement/circle/client.server";
import type { CircleWalletsPort } from "@/lib/settlement/circle/port";
import {
  CIRCLE_DEMO_AMOUNT_MINOR,
  type CircleIntentState,
} from "@/lib/settlement/circle/constants";
import type { CircleSafeEvidence } from "@/lib/settlement/circle/evidence";
import { gateSettlementReceipt } from "@/lib/settlement/circle/receiptGate";
import {
  applyAuthenticatedEvidence,
  findIntentByIdempotency,
  insertPendingIntent,
  listIntentsForApplication,
  toSafeEvidence,
  type SettlementIntentRow,
} from "@/lib/settlement/circle/store";

export interface CircleSettlementView {
  ok: boolean;
  available: boolean;
  code: CirclePublicCode | string;
  activates_production: false;
  not_a_custodian: true;
  intent_is_not_a_payment: true;
  duplicate?: boolean;
  availability: CircleAvailability;
  evidence: CircleSafeEvidence | null;
  intents: CircleSafeEvidence[];
}

function view(input: {
  ok: boolean;
  code: CirclePublicCode | string;
  availability: CircleAvailability;
  evidence?: CircleSafeEvidence | null;
  intents?: CircleSafeEvidence[];
  duplicate?: boolean;
}): CircleSettlementView {
  return {
    ok: input.ok,
    available: input.availability.available,
    code: input.code,
    activates_production: false,
    not_a_custodian: true,
    intent_is_not_a_payment: true,
    duplicate: input.duplicate,
    availability: input.availability,
    evidence: input.evidence ?? null,
    intents: input.intents ?? (input.evidence ? [input.evidence] : []),
  };
}

export function rejectClientProvidedSettlementProof(body: Record<string, unknown> | null): CirclePublicCode | null {
  if (!body) return null;
  const hostile = [
    "transaction_hash",
    "tx_hash",
    "tx_digest",
    "client_transaction_hash",
    "browser_result",
    "callback",
    "mocked",
    "mock_result",
    "wallet_address",
    "destination_address",
    "source_address",
  ];
  for (const key of hostile) {
    if (body[key] != null && body[key] !== "") return CIRCLE_PUBLIC_CODES.client_hash_rejected;
  }
  return null;
}

export function applyCircleProviderResult(
  intent: SettlementIntentRow,
  result: unknown,
): { ok: true; state: CircleIntentState; sealed: CircleAuthenticatedResult } | { ok: false; code: CirclePublicCode } {
  if (!isCircleAuthenticatedResult(result)) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.unauthenticated_result };
  }
  if (result.network !== intent.network || result.currency !== intent.currency) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.wrong_network };
  }
  if (result.amountMinor !== intent.amount_minor) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.amount_mismatch };
  }
  return { ok: true, state: toSettledState(result.providerState), sealed: result };
}

async function persistAuthenticated(
  intent: SettlementIntentRow,
  result: CircleAuthenticatedResult,
): Promise<SettlementIntentRow> {
  const applied = applyCircleProviderResult(intent, result);
  if (!applied.ok) return intent;
  const updated = await applyAuthenticatedEvidence({
    intent,
    state: applied.state,
    providerRequestRef: applied.sealed.providerRequestRef,
    circleTransactionId: applied.sealed.circleTransactionId,
    providerState: applied.sealed.providerState,
    occurredAt: applied.sealed.occurredAt,
  });
  return updated ?? intent;
}

export async function loadCircleSettlementView(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}): Promise<CircleSettlementView> {
  const availability = await probeCircleAvailability();
  const rows = availability.schema_ready
    ? await listIntentsForApplication({
      applicationId: input.application.id,
      partnerId: input.partnerId,
    })
    : [];
  const intents = rows.map(toSafeEvidence);
  const code = availability.available
    ? (intents[0] ? statusCode(intents[0].state) : CIRCLE_PUBLIC_CODES.pending)
    : availability.code ?? CIRCLE_PUBLIC_CODES.unavailable;
  return view({
    ok: true,
    code,
    availability,
    evidence: intents[0] ?? null,
    intents,
  });
}

function statusCode(state: CircleIntentState): CirclePublicCode {
  if (state === "settled") return CIRCLE_PUBLIC_CODES.settled;
  if (state === "failed") return CIRCLE_PUBLIC_CODES.failed;
  if (state === "submitted") return CIRCLE_PUBLIC_CODES.submitted;
  return CIRCLE_PUBLIC_CODES.pending;
}

export async function runCircleSettlement(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  receiptId: string;
  idempotencyKey: string;
  amountMinor?: unknown;
  body?: Record<string, unknown> | null;
  port?: CircleWalletsPort | null;
}): Promise<CircleSettlementView> {
  const availability = await probeCircleAvailability();
  const hostile = rejectClientProvidedSettlementProof(input.body ?? null);
  if (hostile) {
    return view({ ok: false, code: hostile, availability });
  }
  if (!availability.schema_ready) {
    return view({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.schema_unavailable,
      availability,
    });
  }
  if (availability.credentials.production_env_blocked) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.production_blocked, availability });
  }
  if (availability.credentials.live_key_blocked) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.live_credentials_blocked, availability });
  }

  const amountMinor = parseAmountMinor(input.amountMinor, CIRCLE_DEMO_AMOUNT_MINOR);
  if (amountMinor == null) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.invalid_input, availability });
  }
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.invalid_input, availability });
  }

  const gated = await gateSettlementReceipt({
    receiptId: input.receiptId,
    partnerId: input.partnerId,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
  });
  if (!gated.ok) {
    return view({ ok: false, code: gated.code, availability });
  }

  const inserted = await insertPendingIntent({
    applicationId: input.application.id,
    partnerId: input.partnerId,
    idempotencyKey,
    amountMinor,
    receiptId: gated.receipt_id,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
  });
  if (!inserted.ok) {
    return view({ ok: false, code: inserted.code, availability });
  }

  let intent = inserted.row;
  if (inserted.duplicate && intent.state === "settled") {
    return view({
      ok: true,
      code: CIRCLE_PUBLIC_CODES.duplicate,
      availability,
      evidence: toSafeEvidence(intent),
      duplicate: true,
    });
  }

  const existing = await findIntentByIdempotency({
    applicationId: input.application.id,
    partnerId: input.partnerId,
    idempotencyKey,
  });
  if (existing) intent = existing;

  if (!availability.available) {
    await recordLaunchpadActivity(requireSupabaseAdmin(), {
      applicationId: input.application.id,
      partnerId: input.partnerId,
      eventType: "settlement_intent_created",
      publicCode: CIRCLE_PUBLIC_CODES.unavailable,
      metadata: {
        settlement: true,
        state: intent.state,
        activates_production: false,
      },
    }).catch(() => undefined);
    return view({
      ok: true,
      code: availability.code ?? CIRCLE_PUBLIC_CODES.unavailable,
      availability,
      evidence: toSafeEvidence(intent),
      duplicate: inserted.duplicate,
    });
  }

  const port = input.port === undefined ? createCircleWalletsPortFromEnv() : input.port;
  if (!port) {
    return view({
      ok: true,
      code: CIRCLE_PUBLIC_CODES.unavailable,
      availability,
      evidence: toSafeEvidence(intent),
    });
  }

  const auth = await port.authenticateAgainstArcTestnet();
  if (!auth.ok) {
    return view({
      ok: true,
      code: auth.code,
      availability,
      evidence: toSafeEvidence(intent),
    });
  }

  let sealed: CircleAuthenticatedResult | null = null;
  if (intent.circle_transaction_id) {
    const refreshed = await port.getTransaction(intent.circle_transaction_id);
    if (refreshed.ok) sealed = refreshed.result;
  } else {
    const created = await port.createTestnetUsdcTransfer({
      amountMinor: intent.amount_minor,
      idempotencyKey: intent.idempotency_key,
    });
    if (created.ok) sealed = created.result;
  }

  if (!sealed) {
    return view({
      ok: true,
      code: CIRCLE_PUBLIC_CODES.pending,
      availability,
      evidence: toSafeEvidence(intent),
    });
  }

  const applied = applyCircleProviderResult(intent, sealed);
  if (!applied.ok) {
    return view({
      ok: false,
      code: applied.code,
      availability,
      evidence: toSafeEvidence(intent),
    });
  }
  const updated = await persistAuthenticated(intent, sealed);
  await recordLaunchpadActivity(requireSupabaseAdmin(), {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    eventType: updated.state === "settled" ? "settlement_intent_submitted" : "settlement_intent_created",
    publicCode: statusCode(updated.state),
    metadata: {
      settlement: true,
      state: updated.state,
      activates_production: false,
    },
  }).catch(() => undefined);

  return view({
    ok: true,
    code: inserted.duplicate && updated.state === intent.state
      ? CIRCLE_PUBLIC_CODES.duplicate
      : statusCode(updated.state),
    availability,
    evidence: toSafeEvidence(updated),
    duplicate: inserted.duplicate,
  });
}
