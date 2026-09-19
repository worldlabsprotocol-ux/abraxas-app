// FILE: lib/settlement/circle/execute.ts
import "server-only";
// Settlement state machine. Intents stay pending until a sealed Circle result arrives.
// Production routes must never inject a mock Circle port.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { mapOfficialProviderStateToIntent } from "@/lib/settlement/circle/authenticated";
import {
  isCircleAuthenticatedResult,
  type CircleAuthenticatedResult,
} from "@/lib/settlement/circle/authenticated.server";
import {
  probeCircleAvailability,
  type CircleAvailability,
} from "@/lib/settlement/circle/availability";
import { CIRCLE_PUBLIC_CODES, type CirclePublicCode } from "@/lib/settlement/circle/codes";
import { isJudgeDemoRequested } from "@/lib/judgeDemo/contract";
import { createCircleWalletsPortFromEnv } from "@/lib/settlement/circle/client.server";
import {
  CIRCLE_CURRENCY,
  CIRCLE_DEMO_AMOUNT_MINOR,
  CIRCLE_NETWORK,
  CIRCLE_TERMINAL_INTENT_STATES,
  type CircleIntentState,
} from "@/lib/settlement/circle/constants";
import type { CircleSafeEvidence } from "@/lib/settlement/circle/evidence";
import { verifyEligibleReceiptSelection } from "@/lib/settlement/circle/eligibleReceiptSelection";
import { gateSettlementReceipt } from "@/lib/settlement/circle/receiptGate";
import {
  applyAuthenticatedEvidence,
  claimPendingIntentForSubmit,
  getIntentForPartner,
  insertPendingIntent,
  listIntentsForApplication,
  toSafeEvidence,
  type SettlementIntentRow,
} from "@/lib/settlement/circle/store";

export const CIRCLE_TESTNET_CONFIRM_FIELD = "confirm_testnet_transfer" as const;

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
    "wallet_id",
    "source_wallet_id",
    "destination_wallet_id",
    "wallet_set_id",
  ];
  for (const key of hostile) {
    if (body[key] != null && body[key] !== "") return CIRCLE_PUBLIC_CODES.client_hash_rejected;
  }
  return null;
}

const CLIENT_CREATE_OVERRIDE_KEYS = [
  "receipt_id",
  "amount_minor",
  "amount",
  "network",
  "currency",
  "partner_id",
] as const;

const CLIENT_SUBMIT_OVERRIDE_KEYS = [
  "amount_minor",
  "amount",
  "network",
  "currency",
  "receipt_id",
  "partner_id",
  "wallet_address",
  "destination_address",
  "source_address",
  "wallet_id",
  "source_wallet_id",
  "destination_wallet_id",
  "wallet_set_id",
  "selection_token",
] as const;

export function rejectClientCreateOverrides(body: Record<string, unknown> | null): CirclePublicCode | null {
  if (!body) return CIRCLE_PUBLIC_CODES.invalid_input;
  const hostile = rejectClientProvidedSettlementProof(body);
  if (hostile) return hostile;
  for (const key of CLIENT_CREATE_OVERRIDE_KEYS) {
    if (body[key] != null && body[key] !== "") {
      return CIRCLE_PUBLIC_CODES.client_override_rejected;
    }
  }
  return null;
}

export function rejectClientSubmitOverrides(body: Record<string, unknown> | null): CirclePublicCode | null {
  if (!body) return CIRCLE_PUBLIC_CODES.invalid_input;
  const hostile = rejectClientProvidedSettlementProof(body);
  if (hostile) return hostile;
  for (const key of CLIENT_SUBMIT_OVERRIDE_KEYS) {
    if (body[key] != null && body[key] !== "") {
      return CIRCLE_PUBLIC_CODES.client_override_rejected;
    }
  }
  return null;
}

export function parseTestnetSubmitConfirmation(body: Record<string, unknown> | null): boolean {
  return body?.[CIRCLE_TESTNET_CONFIRM_FIELD] === true;
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
  return { ok: true, state: mapOfficialProviderStateToIntent(result.providerState), sealed: result };
}

function isTerminalIntent(state: CircleIntentState): boolean {
  return (CIRCLE_TERMINAL_INTENT_STATES as readonly string[]).includes(state);
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
  if (state === "cancelled") return CIRCLE_PUBLIC_CODES.cancelled;
  if (state === "submitted") return CIRCLE_PUBLIC_CODES.submitted;
  return CIRCLE_PUBLIC_CODES.pending;
}

export async function runCircleSettlement(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  sessionKeyId: string;
  selectionToken?: unknown;
  body?: Record<string, unknown> | null;
}): Promise<CircleSettlementView> {
  const availability = await probeCircleAvailability();
  const hostile = rejectClientCreateOverrides(input.body ?? null);
  if (hostile) {
    return view({ ok: false, code: hostile, availability });
  }
  if (availability.code === CIRCLE_PUBLIC_CODES.production_blocked) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.production_blocked, availability });
  }
  if (availability.code === CIRCLE_PUBLIC_CODES.live_credentials_blocked) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.live_credentials_blocked, availability });
  }
  if (!availability.schema_ready) {
    return view({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.schema_unavailable,
      availability,
    });
  }

  const token = typeof input.selectionToken === "string" ? input.selectionToken : "";
  const verified = await verifyEligibleReceiptSelection(token, {
    partnerId: input.partnerId,
    applicationId: input.application.id,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
    sessionKeyId: input.sessionKeyId,
  });
  if (!verified.ok) {
    return view({ ok: false, code: verified.code, availability });
  }

  const gated = await gateSettlementReceipt({
    receiptId: verified.selection.receiptId,
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
    amountMinor: CIRCLE_DEMO_AMOUNT_MINOR,
    receiptId: gated.receipt_id,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
    selectionJtiHash: verified.selection.jtiHash,
  });
  if (!inserted.ok) {
    return view({ ok: false, code: inserted.code, availability });
  }

  const intent = inserted.row;
  if (inserted.duplicate) {
    return view({
      ok: true,
      code: inserted.replay
        ? CIRCLE_PUBLIC_CODES.selection_replay
        : (isTerminalIntent(intent.state)
          ? CIRCLE_PUBLIC_CODES.duplicate
          : statusCode(intent.state)),
      availability,
      evidence: toSafeEvidence(intent),
      duplicate: true,
    });
  }

  await recordLaunchpadActivity(requireSupabaseAdmin(), {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    eventType: "settlement_intent_created",
    publicCode: CIRCLE_PUBLIC_CODES.pending,
    metadata: {
      settlement: true,
      state: intent.state,
      activates_production: false,
      funds_moved: false,
    },
  }).catch(() => undefined);

  return view({
    ok: true,
    code: CIRCLE_PUBLIC_CODES.pending,
    availability,
    evidence: toSafeEvidence(intent),
    duplicate: false,
  });
}

export async function submitCircleSettlementIntent(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  intentId: string;
  body?: Record<string, unknown> | null;
}): Promise<CircleSettlementView> {
  const availability = await probeCircleAvailability();
  if (isJudgeDemoRequested()) {
    return view({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.judge_demo_transfer_blocked,
      availability,
    });
  }
  const overrides = rejectClientSubmitOverrides(input.body ?? null);
  if (overrides) {
    return view({ ok: false, code: overrides, availability });
  }
  if (!parseTestnetSubmitConfirmation(input.body ?? null)) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.confirm_required, availability });
  }
  if (availability.code === CIRCLE_PUBLIC_CODES.production_blocked) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.production_blocked, availability });
  }
  if (availability.code === CIRCLE_PUBLIC_CODES.live_credentials_blocked) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.live_credentials_blocked, availability });
  }
  if (!availability.schema_ready) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.schema_unavailable, availability });
  }
  if (!availability.available) {
    return view({
      ok: false,
      code: availability.code ?? CIRCLE_PUBLIC_CODES.unavailable,
      availability,
    });
  }

  const loaded = await getIntentForPartner({
    intentId: input.intentId.trim(),
    applicationId: input.application.id,
    partnerId: input.partnerId,
  });
  if (!loaded) {
    return view({ ok: false, code: CIRCLE_PUBLIC_CODES.intent_not_found, availability });
  }
  if (
    loaded.network !== CIRCLE_NETWORK
    || loaded.currency !== CIRCLE_CURRENCY
    || loaded.application_id !== input.application.id
    || loaded.partner_id !== input.partnerId
  ) {
    return view({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.wrong_network,
      availability,
      evidence: toSafeEvidence(loaded),
    });
  }
  if (loaded.state !== "pending" || loaded.circle_transaction_id) {
    return view({
      ok: false,
      code: loaded.state === "pending"
        ? CIRCLE_PUBLIC_CODES.duplicate_submit
        : CIRCLE_PUBLIC_CODES.not_pending,
      availability,
      evidence: toSafeEvidence(loaded),
      duplicate: true,
    });
  }

  const gated = await gateSettlementReceipt({
    receiptId: loaded.receipt_id,
    partnerId: input.partnerId,
    policyId: input.application.policy_id,
    policyVersion: input.application.policy_version,
  });
  if (!gated.ok) {
    return view({
      ok: false,
      code: gated.code,
      availability,
      evidence: toSafeEvidence(loaded),
    });
  }

  const claimed = await claimPendingIntentForSubmit({ intent: loaded });
  if (!claimed) {
    const raced = await getIntentForPartner({
      intentId: loaded.id,
      applicationId: input.application.id,
      partnerId: input.partnerId,
    });
    return view({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.duplicate_submit,
      availability,
      evidence: raced ? toSafeEvidence(raced) : toSafeEvidence(loaded),
      duplicate: true,
    });
  }

  const port = createCircleWalletsPortFromEnv();
  if (!port) {
    return view({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.unavailable,
      availability,
      evidence: toSafeEvidence(claimed),
    });
  }

  const auth = await port.authenticateAgainstArcTestnet();
  if (!auth.ok) {
    return view({
      ok: false,
      code: auth.code,
      availability,
      evidence: toSafeEvidence(claimed),
    });
  }

  const created = await port.createTestnetUsdcTransfer({
    amountMinor: claimed.amount_minor,
    idempotencyKey: claimed.idempotency_key,
  });
  if (!created.ok) {
    return view({
      ok: false,
      code: created.code || CIRCLE_PUBLIC_CODES.unavailable,
      availability,
      evidence: toSafeEvidence(claimed),
    });
  }

  const applied = applyCircleProviderResult(claimed, created.result);
  if (!applied.ok) {
    return view({
      ok: false,
      code: applied.code,
      availability,
      evidence: toSafeEvidence(claimed),
    });
  }

  const updated = await persistAuthenticated(claimed, created.result);
  await recordLaunchpadActivity(requireSupabaseAdmin(), {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    eventType: "settlement_intent_submitted",
    publicCode: statusCode(updated.state),
    metadata: {
      settlement: true,
      state: updated.state,
      activates_production: false,
    },
  }).catch(() => undefined);

  return view({
    ok: true,
    code: statusCode(updated.state),
    availability,
    evidence: toSafeEvidence(updated),
  });
}
