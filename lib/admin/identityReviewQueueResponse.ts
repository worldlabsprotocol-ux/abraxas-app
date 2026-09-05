// FILE: lib/admin/identityReviewQueueResponse.ts
// Privacy-safe admin identity queue list shaping (no PII in list views).

export interface IdentityReviewQueueListItem {
  id: string;
  created_at: string;
  updated_at?: string | null;
  sui_address: string | null;
  status: string;
  capture_session_id: string | null;
  capture_complete: boolean;
  has_selfie: boolean;
  has_id_front: boolean;
  partner_id: string | null;
  policy_id: string | null;
  verification_request_id: string | null;
  review_status: string | null;
  engine_decision: string | null;
  eligibility_result: string | null;
  raw_evidence_purged_at: string | null;
  subject_label: string;
  biometric?: Record<string, unknown> | null;
}

export function subjectLabelFromAddress(suiAddress: string | null | undefined): string {
  if (!suiAddress || suiAddress.length < 12) return "Subject (wallet pending)";
  return `Subject ${suiAddress.slice(0, 6)}…${suiAddress.slice(-4)}`;
}

export function sanitizeBiometricForList(
  biometric: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!biometric) return null;
  const { signals, ...rest } = biometric;
  const safeSignals = signals && typeof signals === "object"
    ? {
        partner_id: (signals as Record<string, unknown>).partner_id,
        threshold_policy_source: (signals as Record<string, unknown>).threshold_policy_source,
        fraud_risk_score: (signals as Record<string, unknown>).fraud_risk_score,
        reason_codes: (signals as Record<string, unknown>).reason_codes,
      }
    : undefined;
  return { ...rest, signals: safeSignals };
}
