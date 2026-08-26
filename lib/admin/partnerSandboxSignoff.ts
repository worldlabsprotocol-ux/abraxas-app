// FILE: lib/admin/partnerSandboxSignoff.ts
// Operator sandbox pilot sign-off — server-owned JSONB CAS on partners.onboarding_checklist.

export const FORBIDDEN_CLIENT_CHECKLIST_FIELDS = [
  "onboarding_checklist",
  "expected_onboarding_checklist",
  "expected_checklist_for_cas",
] as const;

export type ForbiddenClientChecklistField = (typeof FORBIDDEN_CLIENT_CHECKLIST_FIELDS)[number];

export interface GateState {
  operator_ack: boolean;
  manual_partner_confirmation?: boolean;
  acknowledged_at: string | null;
}

export interface WebhookTrackGates {
  queued: GateState;
  http_delivered: GateState;
  signature_verified_by_receiver: GateState;
}

export interface PartnerSandboxPilotSignoff {
  version: 1;
  application_id: string | null;
  gates: {
    configured: GateState;
    partner_flow_tested: GateState;
    partner_verified: GateState;
    approved_for_pilot_continuation: GateState;
    webhook_track?: WebhookTrackGates;
  };
  evidence: {
    policy_id?: string;
    receipt_id?: string;
    event_id?: string;
  };
}

export interface SandboxSignoffPatchBody {
  partner_id?: string;
  gates?: Partial<{
    configured: Partial<GateState>;
    partner_flow_tested: Partial<GateState>;
    partner_verified: Partial<GateState>;
    approved_for_pilot_continuation: Partial<GateState>;
    webhook_track: Partial<{
      queued: Partial<GateState>;
      http_delivered: Partial<GateState>;
      signature_verified_by_receiver: Partial<GateState>;
    }>;
  }>;
  evidence?: {
    policy_id?: string;
    receipt_id?: string;
    event_id?: string;
  };
}

export interface SandboxSignoffGetResponse {
  partner_id: string;
  updated_at: string;
  signoff: PartnerSandboxPilotSignoff;
  application: { id: string; status: string } | null;
  reviewer_notes: string | null;
}

export type ChecklistCasFilter =
  | { kind: "is"; column: "onboarding_checklist"; value: null }
  | { kind: "eq"; column: "onboarding_checklist"; value: unknown };

export type ApplyCasResult =
  | { ok: true; updated_at: string }
  | { ok: false; code: "checklist_conflict" };

export interface ChecklistCasQueryable {
  eq(column: string, value: unknown): ChecklistCasQueryable;
  is(column: string, value: null): ChecklistCasQueryable;
}

const SECRET_OR_KEY_PATTERN =
  /^(abx_(test|live)_|whsec_|sk_(live|test)_|eyJ[A-Za-z0-9_-]+\.eyJ)/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBHOOK_EVENT_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const WEBHOOK_EVENT_ID_MAX_LENGTH = 128;

export const WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE =
  "Clear the webhook-track gates before recording a different test event.";

function emptyGate(): GateState {
  return { operator_ack: false, acknowledged_at: null };
}

export function defaultSandboxPilotSignoff(applicationId: string | null = null): PartnerSandboxPilotSignoff {
  return {
    version: 1,
    application_id: applicationId,
    gates: {
      configured: emptyGate(),
      partner_flow_tested: emptyGate(),
      partner_verified: emptyGate(),
      approved_for_pilot_continuation: emptyGate(),
    },
    evidence: {},
  };
}

export function defaultWebhookTrackGates(): WebhookTrackGates {
  return {
    queued: emptyGate(),
    http_delivered: emptyGate(),
    signature_verified_by_receiver: emptyGate(),
  };
}

export function splitPriorChecklist(raw: unknown): {
  rawPriorChecklist: Record<string, unknown> | null;
  priorChecklist: Record<string, unknown>;
} {
  if (raw === null || raw === undefined) {
    return { rawPriorChecklist: null, priorChecklist: {} };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { rawPriorChecklist: {}, priorChecklist: {} };
  }
  const record = raw as Record<string, unknown>;
  return { rawPriorChecklist: record, priorChecklist: { ...record } };
}

export function readSandboxPilotSignoff(
  priorChecklist: Record<string, unknown>,
  applicationId: string | null,
): PartnerSandboxPilotSignoff {
  const raw = priorChecklist.sandbox_pilot_signoff;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultSandboxPilotSignoff(applicationId);
  }
  return sanitizeSignoffForResponse(raw as PartnerSandboxPilotSignoff, applicationId);
}

export function sanitizeSignoffForResponse(
  input: PartnerSandboxPilotSignoff,
  applicationId: string | null,
): PartnerSandboxPilotSignoff {
  const webhook = input.gates?.webhook_track;
  return {
    version: 1,
    application_id: input.application_id ?? applicationId,
    gates: {
      configured: normalizeGate(input.gates?.configured),
      partner_flow_tested: normalizeGate(input.gates?.partner_flow_tested),
      partner_verified: normalizeGate(input.gates?.partner_verified),
      approved_for_pilot_continuation: normalizeGate(input.gates?.approved_for_pilot_continuation),
      ...(webhook
        ? {
            webhook_track: {
              queued: normalizeGate(webhook.queued),
              http_delivered: normalizeGate(webhook.http_delivered),
              signature_verified_by_receiver: normalizeGate(webhook.signature_verified_by_receiver),
            },
          }
        : {}),
    },
    evidence: sanitizeEvidence(input.evidence),
  };
}

function normalizeGate(gate: Partial<GateState> | undefined): GateState {
  const operator_ack = gate?.operator_ack === true;
  return {
    operator_ack,
    ...(gate?.manual_partner_confirmation === true
      ? { manual_partner_confirmation: true }
      : {}),
    acknowledged_at: operator_ack
      ? (typeof gate?.acknowledged_at === "string" ? gate.acknowledged_at : new Date().toISOString())
      : null,
  };
}

function sanitizeEvidence(
  evidence: PartnerSandboxPilotSignoff["evidence"] | undefined,
): PartnerSandboxPilotSignoff["evidence"] {
  if (!evidence || typeof evidence !== "object") return {};
  const out: PartnerSandboxPilotSignoff["evidence"] = {};
  if (typeof evidence.policy_id === "string" && evidence.policy_id.trim()) {
    out.policy_id = evidence.policy_id.trim();
  }
  if (typeof evidence.receipt_id === "string" && evidence.receipt_id.trim()) {
    out.receipt_id = evidence.receipt_id.trim();
  }
  if (typeof evidence.event_id === "string" && evidence.event_id.trim()) {
    out.event_id = evidence.event_id.trim();
  }
  return out;
}

export function findForbiddenClientChecklistField(
  body: Record<string, unknown>,
): ForbiddenClientChecklistField | null {
  for (const field of FORBIDDEN_CLIENT_CHECKLIST_FIELDS) {
    if (field in body) return field;
  }
  return null;
}

export function validateEvidenceValue(field: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${field} cannot be empty`;
  if (/\s/.test(trimmed)) return `${field} must not contain whitespace`;
  if (SECRET_OR_KEY_PATTERN.test(trimmed)) return `${field} must not contain secrets or API keys`;
  if (EMAIL_PATTERN.test(trimmed)) return `${field} must not contain email addresses`;
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("://")) {
    return `${field} must not contain URLs`;
  }
  if (trimmed.length > 256) return `${field} is too long`;
  if (field === "event_id" && !isValidWebhookEventId(trimmed)) {
    return `${field} must use a safe event ID format`;
  }
  return null;
}

export function isValidWebhookEventId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > WEBHOOK_EVENT_ID_MAX_LENGTH) return false;
  if (/\s/.test(trimmed)) return false;
  return WEBHOOK_EVENT_ID_PATTERN.test(trimmed);
}

export function anyWebhookGateAcknowledged(
  webhook: WebhookTrackGates | undefined,
): boolean {
  if (!webhook) return false;
  return (
    webhook.queued.operator_ack
    || webhook.http_delivered.operator_ack
    || webhook.signature_verified_by_receiver.operator_ack
  );
}

export function webhookEventIdChangeBlocked(
  signoff: PartnerSandboxPilotSignoff,
  priorEventId: string,
  nextEventId: string,
): boolean {
  const priorTrimmed = priorEventId.trim();
  const nextTrimmed = nextEventId.trim();
  if (!priorTrimmed || priorTrimmed === nextTrimmed) return false;
  return anyWebhookGateAcknowledged(signoff.gates.webhook_track);
}

export function validateEvidencePatch(
  evidence: SandboxSignoffPatchBody["evidence"],
): { ok: true; evidence: PartnerSandboxPilotSignoff["evidence"] } | { ok: false; error: string } {
  if (!evidence) return { ok: true, evidence: {} };
  const next: PartnerSandboxPilotSignoff["evidence"] = {};
  for (const key of ["policy_id", "receipt_id", "event_id"] as const) {
    const value = evidence[key];
    if (value === undefined) continue;
    if (typeof value !== "string") return { ok: false, error: `${key} must be a string` };
    const err = validateEvidenceValue(key, value);
    if (err) return { ok: false, error: err };
    next[key] = value.trim();
  }
  return { ok: true, evidence: next };
}

function mergeGateState(
  prior: GateState,
  patch: Partial<GateState> | undefined,
): GateState {
  if (!patch) return prior;
  const operator_ack = patch.operator_ack ?? prior.operator_ack;
  const manual_partner_confirmation =
    patch.manual_partner_confirmation ?? prior.manual_partner_confirmation;

  const acknowledged_at = operator_ack
    ? (prior.operator_ack && prior.acknowledged_at
        ? prior.acknowledged_at
        : new Date().toISOString())
    : null;

  return {
    operator_ack,
    ...(manual_partner_confirmation ? { manual_partner_confirmation: true } : {}),
    acknowledged_at,
  };
}

export function mergeSignoffPatch(
  prior: PartnerSandboxPilotSignoff,
  patch: SandboxSignoffPatchBody,
  applicationId: string | null,
): PartnerSandboxPilotSignoff {
  const gatesPatch = patch.gates ?? {};
  const evidenceResult = validateEvidencePatch(patch.evidence);
  if (!evidenceResult.ok) {
    throw new Error(evidenceResult.error);
  }

  const next: PartnerSandboxPilotSignoff = {
    version: 1,
    application_id: prior.application_id ?? applicationId,
    gates: {
      configured: mergeGateState(prior.gates.configured, gatesPatch.configured),
      partner_flow_tested: mergeGateState(prior.gates.partner_flow_tested, gatesPatch.partner_flow_tested),
      partner_verified: mergeGateState(prior.gates.partner_verified, gatesPatch.partner_verified),
      approved_for_pilot_continuation: mergeGateState(
        prior.gates.approved_for_pilot_continuation,
        gatesPatch.approved_for_pilot_continuation,
      ),
    },
    evidence: {
      ...prior.evidence,
      ...evidenceResult.evidence,
    },
  };

  if (gatesPatch.webhook_track) {
    const priorWebhook = prior.gates.webhook_track ?? defaultWebhookTrackGates();
    next.gates.webhook_track = {
      queued: mergeGateState(priorWebhook.queued, gatesPatch.webhook_track.queued),
      http_delivered: mergeGateState(priorWebhook.http_delivered, gatesPatch.webhook_track.http_delivered),
      signature_verified_by_receiver: mergeGateState(
        priorWebhook.signature_verified_by_receiver,
        gatesPatch.webhook_track.signature_verified_by_receiver,
      ),
    };
  } else if (prior.gates.webhook_track) {
    next.gates.webhook_track = prior.gates.webhook_track;
  }

  validateWebhookEventIdBinding(prior, next);
  validateGateDependencies(next);
  return next;
}

export function validateWebhookEventIdBinding(
  prior: PartnerSandboxPilotSignoff,
  next: PartnerSandboxPilotSignoff,
): void {
  const priorEventId = prior.evidence.event_id?.trim() ?? "";
  const nextEventId = next.evidence.event_id?.trim() ?? "";
  if (!priorEventId || priorEventId === nextEventId) return;
  if (!anyWebhookGateAcknowledged(prior.gates.webhook_track)) return;
  if (anyWebhookGateAcknowledged(next.gates.webhook_track)) {
    throw new Error("webhook_event_change_requires_gate_reset");
  }
}

function requireWebhookEventIdForAcknowledgedGates(signoff: PartnerSandboxPilotSignoff): void {
  const webhook = signoff.gates.webhook_track;
  if (!webhook || !anyWebhookGateAcknowledged(webhook)) return;
  const eventId = signoff.evidence.event_id?.trim();
  if (!eventId || !isValidWebhookEventId(eventId)) {
    throw new Error("webhook_event_id_required");
  }
}

export function validateGateDependencies(signoff: PartnerSandboxPilotSignoff): void {
  const { gates } = signoff;
  if (gates.partner_verified.operator_ack && !gates.partner_verified.manual_partner_confirmation) {
    throw new Error("manual_partner_confirmation_required");
  }
  const webhook = gates.webhook_track;
  if (webhook) {
    requireWebhookEventIdForAcknowledgedGates(signoff);
    if (webhook.http_delivered.operator_ack && !webhook.queued.operator_ack) {
      throw new Error("webhook_queued_required");
    }
    if (webhook.signature_verified_by_receiver.operator_ack && !webhook.http_delivered.operator_ack) {
      throw new Error("webhook_delivered_required");
    }
    if (
      webhook.signature_verified_by_receiver.operator_ack
      && !webhook.signature_verified_by_receiver.manual_partner_confirmation
    ) {
      throw new Error("manual_partner_confirmation_required");
    }
  }
  if (gates.approved_for_pilot_continuation.operator_ack) {
    if (!gates.configured.operator_ack || !gates.partner_flow_tested.operator_ack || !gates.partner_verified.operator_ack) {
      throw new Error("pilot_continuation_requires_prior_gates");
    }
  }
}

export function buildNextChecklist(
  priorChecklist: Record<string, unknown>,
  nextSignoff: PartnerSandboxPilotSignoff,
): Record<string, unknown> {
  return {
    ...priorChecklist,
    sandbox_pilot_signoff: nextSignoff,
  };
}

export function describeChecklistCasFilter(rawPriorChecklist: unknown): ChecklistCasFilter {
  if (rawPriorChecklist === null) {
    return { kind: "is", column: "onboarding_checklist", value: null };
  }
  return { kind: "eq", column: "onboarding_checklist", value: rawPriorChecklist };
}

export function applyChecklistCasFilter<Q extends ChecklistCasQueryable>(query: Q, filter: ChecklistCasFilter): Q {
  if (filter.kind === "is") {
    return query.is(filter.column, filter.value) as Q;
  }
  const eqValue =
    typeof filter.value === "object" && filter.value !== null
      ? JSON.stringify(filter.value)
      : filter.value;
  return query.eq(filter.column, eqValue) as Q;
}

export function serializeChecklistCasFilterForPostgrest(filter: ChecklistCasFilter): string {
  if (filter.kind === "is") {
    return `${filter.column}=is.null`;
  }
  const encoded = encodeURIComponent(JSON.stringify(filter.value));
  return `${filter.column}=eq.${encoded}`;
}

export async function applySandboxSignoffCasUpdate(
  runUpdate: (
    filter: ChecklistCasFilter,
    payload: { onboarding_checklist: Record<string, unknown>; updated_at: string },
  ) => Promise<{ updated_at: string } | null>,
  rawPriorChecklist: unknown,
  priorChecklist: Record<string, unknown>,
  nextChecklist: Record<string, unknown>,
): Promise<ApplyCasResult> {
  const filter = describeChecklistCasFilter(rawPriorChecklist);
  const updated_at = new Date().toISOString();
  const row = await runUpdate(filter, { onboarding_checklist: nextChecklist, updated_at });
  if (!row) {
    return { ok: false, code: "checklist_conflict" };
  }
  return { ok: true, updated_at: row.updated_at };
}

export function buildDesignPartnerPatchPayload(body: {
  id?: string;
  status?: string;
  reviewer_notes?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
  };
  if (body.status) payload.status = body.status;
  if ("reviewer_notes" in body) {
    const trimmed = body.reviewer_notes?.trim();
    payload.reviewer_notes = trimmed ? trimmed : null;
  }
  return payload;
}
