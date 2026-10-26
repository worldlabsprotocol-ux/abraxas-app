export const DECISION_RECEIPT_SCHEMA_V1_0 = "1.0.0" as const;
export const DECISION_RECEIPT_SCHEMA_V1_1 = "1.1.0" as const;

export const APPLICATION_BINDING_SCOPE_SCHEMA = "abraxas.application_binding_scope/v1" as const;
export const EVIDENCE_COMMITMENT_SCHEMA = "abraxas.evidence_commitment/v1" as const;

/** Domain separation prefix for evidence commitment digests (UTF-8). */
export const EVIDENCE_COMMITMENT_DOMAIN = "abraxas|decision_receipt|evidence_commitment|v1\0";
