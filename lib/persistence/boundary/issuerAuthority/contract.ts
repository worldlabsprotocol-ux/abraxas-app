// FILE: lib/persistence/boundary/issuerAuthority/contract.ts
// Signed issuer authority statements — verifiable without trusting operational DB rows.

export const ISSUER_AUTHORITY_STATEMENT_DOCUMENT = "abraxas_issuer_authority_statement" as const;
export const ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION = "1.0.0" as const;

export type IssuerAuthorityKeyEntry = {
  key_id: string;
  environment: "demo" | "production";
  status: "active" | "retiring" | "retired" | "revoked";
  not_before: string;
  expires_at: string | null;
  public_jwk: JsonWebKey;
  schema_versions: string[];
  allow_historical_verification: boolean;
  historical_verify_until: string | null;
  reason_class: string;
};

export type IssuerAuthorityStatementPayload = {
  document: typeof ISSUER_AUTHORITY_STATEMENT_DOCUMENT;
  schema_version: typeof ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION;
  /** Monotonic registry epoch — verifiers reject rollback below cached minimum. */
  registry_version: number;
  supersedes_registry_version: number | null;
  environment: "demo" | "production";
  issued_at: string;
  not_before: string;
  anchor_key_id: string;
  keys: IssuerAuthorityKeyEntry[];
};

export type SignedIssuerAuthorityStatement = {
  payload: IssuerAuthorityStatementPayload;
  payload_hash: string;
  signature: string;
  anchor_key_id: string;
};
