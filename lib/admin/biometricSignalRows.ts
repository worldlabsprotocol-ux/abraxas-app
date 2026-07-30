// FILE: lib/admin/biometricSignalRows.ts
// Pure row builder for admin identity biometric signal panel.

export interface AdminBiometricRecord {
  face_match_score?: number;
  liveness_score?: number;
  document_quality_score?: number;
  selfie_quality_score?: number;
  decision?: string;
  reviewer_decision?: string | null;
  assurance_level?: string;
  review_method?: string;
  engine_version?: string;
  signals?: Record<string, unknown>;
}

function pct(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/a";
  return `${(n * 100).toFixed(0)}%`;
}

function boolLabel(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "n/a";
}

function listLabel(value: unknown): string {
  if (Array.isArray(value) && value.length > 0) {
    return value.map(String).join(", ");
  }
  return "n/a";
}

export function buildBiometricSignalRows(bio: AdminBiometricRecord): Array<[string, string]> {
  const signals = bio.signals ?? {};
  const fraud = signals.fraud_risk ?? signals.fraud_risk_score;
  const tamper = signals.tamper_score ?? signals.id_tamper_score;

  return [
    ["Engine version", bio.engine_version ?? "n/a"],
    ["Engine decision", bio.decision ?? "n/a"],
    ["Reviewer decision", bio.reviewer_decision ?? "pending"],
    ["Threshold source", String(signals.threshold_policy_source ?? "global")],
    ["Partner", String(signals.partner_id || "n/a")],
    ["Fraud risk", pct(fraud)],
    ["Face match", pct(signals.face_match ?? bio.face_match_score)],
    ["Face match method", String(signals.face_match_method ?? "n/a")],
    ["Liveness", pct(signals.liveness ?? bio.liveness_score)],
    ["Selfie blur", pct(signals.selfie_blur_score)],
    ["Selfie lighting", pct(signals.selfie_lighting_score)],
    ["Selfie occlusion", pct(signals.selfie_occlusion_score)],
    ["Alignment", pct(signals.alignment_score)],
    ["Face coverage", pct(signals.face_coverage)],
    ["Screen replay", pct(signals.screen_replay_score)],
    ["Deepfake score", pct(signals.deepfake_score)],
    ["Deepfake status", String(signals.deepfake_status ?? "n/a")],
    ["Document type", String(signals.document_type ?? "n/a")],
    ["Document confidence", pct(signals.document_confidence)],
    ["ID image quality", pct(bio.document_quality_score)],
    ["Selfie quality", pct(bio.selfie_quality_score)],
    ["Tamper score", pct(tamper)],
    ["Face detected (ID)", boolLabel(signals.face_detected_id)],
    ["Face detected (selfie)", boolLabel(signals.face_detected_selfie)],
    ["Selfie face count", String(signals.selfie_face_count ?? signals.face_count_selfie ?? "n/a")],
    ["Reason codes", listLabel(signals.reason_codes)],
    ["Assurance", bio.assurance_level ?? "n/a"],
    ["Review method", bio.review_method ?? "n/a"],
  ];
}
