// FILE: lib/institutionalVerification/clientSurface.ts
// Browser-safe constants for developer UI (no Node or verifier imports).

export const INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION = "586.v1" as const;

export type InstitutionalVerificationContractClientView = {
  contract_version: string;
  trust_material: {
    receipt_key_document_digest: string | null;
    receipt_key_environment: string | null;
    bootstrap_notice: string;
  };
};
