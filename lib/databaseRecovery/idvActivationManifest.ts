// FILE: lib/databaseRecovery/idvActivationManifest.ts
// Wallet-native Abraxas Verify schema activation (demo IDV recovery).

export const DEMO_IDV_ACTIVATION_MANIFEST = [
  "021_passport_documents_manual_idv.sql",
  "036_identity_capture_metadata.sql",
  "037_biometric_assessments.sql",
  "050_identity_review_workflow.sql",
  "051_identity_biometric_service_update.sql",
  "079_identity_review_sessions.sql",
  "137_idv_holder_subject_columns.sql",
] as const;

export type DemoIdvActivationMigration = (typeof DEMO_IDV_ACTIVATION_MANIFEST)[number];
