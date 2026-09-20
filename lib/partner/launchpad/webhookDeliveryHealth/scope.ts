// FILE: lib/partner/launchpad/webhookDeliveryHealth/scope.ts
// Attribute deliveries only when payload.policy_id exactly matches the pinned policy.

export const WEBHOOK_HEALTH_DELIVERY_SCOPES = ["app_policy", "partner_wide"] as const;
export type WebhookHealthDeliveryScope = (typeof WEBHOOK_HEALTH_DELIVERY_SCOPES)[number];

export const WEBHOOK_HEALTH_APP_POLICY_LABEL = "This app’s policy deliveries" as const;
export const WEBHOOK_HEALTH_PARTNER_WIDE_LABEL = "Partner-wide webhook delivery health" as const;

export const WEBHOOK_HEALTH_APP_POLICY_EXPLANATION =
  "These counts and rows are limited to outbox events whose policy identifier matches this app’s pinned policy. Missing policy identifiers are not treated as this app.";

export const WEBHOOK_HEALTH_PARTNER_WIDE_EXPLANATION =
  "The webhook outbox is keyed by partner, not by Launchpad app. These counts are partner-wide. They are not this app’s deliveries and do not mean this app is ready.";

export interface WebhookHealthAttributedRow {
  outbox_id: string;
  event_type: string;
  status: string;
  occurred_at: string;
  delivered_at: string | null;
  last_error_code: string | null;
  policy_id: string | null;
}

export function extractOutboxPolicyId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as { policy_id?: unknown }).policy_id;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function partitionWebhookHealthDeliveries(input: {
  selectedPolicyId: string;
  policyFieldReadable: boolean;
  rows: WebhookHealthAttributedRow[];
}): {
  delivery_scope: WebhookHealthDeliveryScope;
  scope_label: typeof WEBHOOK_HEALTH_APP_POLICY_LABEL | typeof WEBHOOK_HEALTH_PARTNER_WIDE_LABEL;
  scope_explanation: string;
  rows: Omit<WebhookHealthAttributedRow, "policy_id">[];
} {
  const selected = input.selectedPolicyId.trim();
  if (!input.policyFieldReadable || !selected) {
    return {
      delivery_scope: "partner_wide",
      scope_label: WEBHOOK_HEALTH_PARTNER_WIDE_LABEL,
      scope_explanation: WEBHOOK_HEALTH_PARTNER_WIDE_EXPLANATION,
      rows: input.rows.map(stripPolicy),
    };
  }

  const matching = input.rows.filter((row) => row.policy_id === selected);
  return {
    delivery_scope: "app_policy",
    scope_label: WEBHOOK_HEALTH_APP_POLICY_LABEL,
    scope_explanation: WEBHOOK_HEALTH_APP_POLICY_EXPLANATION,
    rows: matching.map(stripPolicy),
  };
}

function stripPolicy(row: WebhookHealthAttributedRow): Omit<WebhookHealthAttributedRow, "policy_id"> {
  return {
    outbox_id: row.outbox_id,
    event_type: row.event_type,
    status: row.status,
    occurred_at: row.occurred_at,
    delivered_at: row.delivered_at,
    last_error_code: row.last_error_code,
  };
}
