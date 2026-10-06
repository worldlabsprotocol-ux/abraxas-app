export interface PartnerWebhookPayload {
  event_id: string;
  event_type: string;
  partner_id: string;
  occurred_at?: string;
  receipt_id?: string | null;
  policy_id?: string | null;
  policy_version?: number | null;
  decision_id?: string | null;
  reason_code?: string | null;
  outcome?: string | null;
}
