// FILE: lib/idv/adminIdentitySchema.ts
// Canonical column lists for admin identity review — used by schema verify + docs.

/** Effective passport_documents schema (021 + 036). */
export const PASSPORT_DOCUMENTS_COLUMNS = [
  "id",
  "created_at",
  "user_email",
  "stamp_id",
  "file_name",
  "storage_path",
  "status",
  "updated_at",
  "sui_address",
  "reviewer_note",
  "reviewed_at",
  "reviewed_by",
  "document_type",
  "capture_session_id",
  "legal_name",
] as const;

/** identity_biometric_assessments (037 + 050). */
export const IDENTITY_BIOMETRIC_ASSESSMENTS_COLUMNS = [
  "id",
  "created_at",
  "capture_session_id",
  "sui_address",
  "face_match_score",
  "liveness_score",
  "document_quality_score",
  "selfie_quality_score",
  "decision",
  "assurance_level",
  "review_method",
  "engine_version",
  "signals",
  "analyzed_at",
  "reviewer_decision",
  "reviewer_id",
  "reviewed_at",
] as const;

/** identity_review_audit_log (050). */
export const IDENTITY_REVIEW_AUDIT_LOG_COLUMNS = [
  "id",
  "created_at",
  "capture_session_id",
  "passport_document_id",
  "sui_address",
  "reviewer_id",
  "action",
  "previous_status",
  "new_status",
  "engine_decision",
  "reviewer_decision",
  "rejection_reasons",
  "notes",
  "biometric_engine_version",
] as const;

/** identity_verifications columns touched by admin review + issuance (006 + 007 + 020). */
export const IDENTITY_VERIFICATIONS_ADMIN_COLUMNS = [
  "wallet_address",
  "sui_address",
  "user_email",
  "status",
  "identity_verification_status",
  "credential_status",
  "credential_jti",
  "error_message",
  "credential_issued_at",
  "updated_at",
] as const;

/** Columns read/written per workflow step — must exist in DB. */
export const ADMIN_WORKFLOW_COLUMN_USAGE = {
  queue_passport_documents_select: [
    "id",
    "created_at",
    "user_email",
    "sui_address",
    "file_name",
    "storage_path",
    "status",
    "reviewer_note",
    "document_type",
    "capture_session_id",
    "legal_name",
  ],
  queue_biometric_select: [
    "capture_session_id",
    "face_match_score",
    "liveness_score",
    "document_quality_score",
    "selfie_quality_score",
    "decision",
    "assurance_level",
    "review_method",
    "engine_version",
    "reviewer_decision",
    "reviewer_id",
    "reviewed_at",
    "signals",
  ],
  approve_passport_documents_update: [
    "status",
    "sui_address",
    "reviewer_note",
    "reviewed_at",
    "reviewed_by",
    "updated_at",
  ],
  approve_biometric_update: ["reviewer_decision", "reviewer_id", "reviewed_at"],
  audit_log_insert: IDENTITY_REVIEW_AUDIT_LOG_COLUMNS.filter(c => c !== "id" && c !== "created_at"),
} as const;

export const MIGRATION_COLUMN_SOURCES: Record<string, string> = {
  "passport_documents.reviewer_note": "021_passport_documents_manual_idv.sql",
  "passport_documents.reviewed_at": "021_passport_documents_manual_idv.sql",
  "passport_documents.reviewed_by": "021_passport_documents_manual_idv.sql",
  "passport_documents.document_type": "036_identity_capture_metadata.sql",
  "passport_documents.capture_session_id": "036_identity_capture_metadata.sql",
  "passport_documents.legal_name": "036_identity_capture_metadata.sql",
  "identity_biometric_assessments.*": "037_biometric_assessments.sql",
  "identity_biometric_assessments.reviewer_decision": "050_identity_review_workflow.sql",
  "identity_biometric_assessments.reviewer_id": "050_identity_review_workflow.sql",
  "identity_biometric_assessments.reviewed_at": "050_identity_review_workflow.sql",
  "identity_review_audit_log.*": "050_identity_review_workflow.sql",
  "identity_verifications.sui_address": "007_sui_zklogin.sql",
  "identity_verifications.user_email": "007_sui_zklogin.sql",
  "identity_verifications.identity_verification_status": "020_identity_verification_state_machine.sql",
  "identity_verifications.credential_status": "020_identity_verification_state_machine.sql",
};
