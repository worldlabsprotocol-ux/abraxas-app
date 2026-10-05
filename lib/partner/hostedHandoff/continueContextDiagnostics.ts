// FILE: lib/partner/hostedHandoff/continueContextDiagnostics.ts
// Server-side diagnostics for hosted-handoff continue-context 503 forensics. Logs only — never returned to clients.

import { createHash } from "node:crypto";

export type HostedHandoffContinueDiagnosticStage =
  | "resolve_enter"
  | "handoff_load_throw"
  | "handoff_missing"
  | "handoff_status"
  | "handoff_expiry"
  | "application_load_throw"
  | "application_missing"
  | "callback_ref_unresolved"
  | "continuation_peek"
  | "continuation_opaque_rpc"
  | "continuation_reuse_consumed"
  | "continuation_reuse_expired"
  | "continuation_reuse_binding"
  | "continuation_create_rejected"
  | "continuation_save_throw"
  | "continuation_conflict_recovery"
  | "continuation_ensure_throw"
  | "resolve_success";

export type HostedHandoffContinueDiagnosticPayload = {
  stage: HostedHandoffContinueDiagnosticStage;
  verifyRequestRef?: string;
  handoffRef?: string;
  continuationJti?: string;
  errorClass?: string;
  internalCode?: string;
  postgresCode?: string;
  rawExpiresAt?: string;
  mappedExpiresAt?: string;
  parsedExpiryEpoch?: number | null;
  nowEpoch?: number;
  expired?: boolean;
  consumed?: boolean;
  peekFound?: boolean;
  rowCountHint?: number;
  bindingOk?: boolean;
  bindingCode?: string;
  dbWriteAttempted?: boolean;
  dbWriteResult?: string;
  functionName?: string;
  opaqueRpc?: Record<string, unknown>;
};

const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const EMAIL_PATTERN = /@[a-z0-9.-]+\.[a-z]{2,}/i;
const WALLET_PATTERN = /^0x[a-fA-F0-9]{40,}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeRef(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (JWT_PATTERN.test(trimmed) || EMAIL_PATTERN.test(trimmed) || WALLET_PATTERN.test(trimmed)) {
    return undefined;
  }
  if (
    trimmed.startsWith("vr_")
    || trimmed.startsWith("hpf_")
    || trimmed.startsWith("jti-")
    || UUID_PATTERN.test(trimmed)
  ) {
    return trimmed;
  }
  return `ref_${createHash("sha256").update(trimmed).digest("hex").slice(0, 12)}`;
}

function safeExpiresAt(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (EMAIL_PATTERN.test(trimmed) || WALLET_PATTERN.test(trimmed)) return undefined;
  if (trimmed.length > 64) return undefined;
  return trimmed;
}

export function buildHostedHandoffContinueDiagnosticPayload(
  input: HostedHandoffContinueDiagnosticPayload,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: "abraxas_hosted_handoff_continue_diagnostic",
    stage: input.stage,
  };

  const verifyRequestRef = safeRef(input.verifyRequestRef);
  if (verifyRequestRef) payload.verify_request_ref = verifyRequestRef;

  const handoffRef = safeRef(input.handoffRef);
  if (handoffRef) payload.handoff_ref = handoffRef;

  const continuationJti = safeRef(input.continuationJti);
  if (continuationJti) payload.continuation_jti = continuationJti;

  if (input.errorClass) payload.error_class = input.errorClass.slice(0, 120);
  if (input.internalCode) payload.internal_code = input.internalCode.slice(0, 120);
  if (input.postgresCode) payload.postgres_code = input.postgresCode.slice(0, 32);

  const rawExpiresAt = safeExpiresAt(input.rawExpiresAt);
  if (rawExpiresAt) payload.raw_expires_at = rawExpiresAt;

  const mappedExpiresAt = safeExpiresAt(input.mappedExpiresAt);
  if (mappedExpiresAt) payload.mapped_expires_at = mappedExpiresAt;

  if (input.parsedExpiryEpoch != null) payload.parsed_expiry_epoch = input.parsedExpiryEpoch;
  if (input.nowEpoch != null) payload.now_epoch = input.nowEpoch;
  if (input.expired != null) payload.expired = input.expired;
  if (input.consumed != null) payload.consumed = input.consumed;
  if (input.peekFound != null) payload.peek_found = input.peekFound;
  if (input.rowCountHint != null) payload.row_count_hint = input.rowCountHint;
  if (input.bindingOk != null) payload.binding_ok = input.bindingOk;
  if (input.bindingCode) payload.binding_code = input.bindingCode.slice(0, 64);
  if (input.dbWriteAttempted != null) payload.db_write_attempted = input.dbWriteAttempted;
  if (input.dbWriteResult) payload.db_write_result = input.dbWriteResult.slice(0, 64);
  if (input.functionName) payload.function_name = input.functionName.slice(0, 120);

  if (input.opaqueRpc) {
    for (const [key, value] of Object.entries(input.opaqueRpc)) {
      if (value !== undefined) payload[key] = value;
    }
  }

  return payload;
}

export function logHostedHandoffContinueDiagnostic(
  input: HostedHandoffContinueDiagnosticPayload,
): void {
  if (typeof process === "undefined") return;
  console.error(JSON.stringify(buildHostedHandoffContinueDiagnosticPayload(input)));
}
