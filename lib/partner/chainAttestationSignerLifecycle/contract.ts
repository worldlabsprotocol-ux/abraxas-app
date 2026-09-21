// Server-owned chain-attestation signer lifecycle. Public verifier material only.

export const CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV = "ABRAXAS_CHAIN_ATTESTATION_SIGNER_REGISTRY" as const;
export const CHAIN_ATTESTATION_SIGNER_DOCUMENT = "abraxas_chain_attestation_verification_keys" as const;

export const CHAIN_ATTESTATION_SIGNER_ALGORITHMS = ["secp256k1", "ed25519"] as const;
export type ChainAttestationSignerAlgorithm = (typeof CHAIN_ATTESTATION_SIGNER_ALGORITHMS)[number];

export const CHAIN_ATTESTATION_SIGNER_ENVIRONMENTS = ["sandbox", "production"] as const;
export type ChainAttestationSignerEnvironment = (typeof CHAIN_ATTESTATION_SIGNER_ENVIRONMENTS)[number];

export const CHAIN_ATTESTATION_SIGNER_STATUSES = ["active", "retiring", "retired", "revoked"] as const;
export type ChainAttestationSignerStatus = (typeof CHAIN_ATTESTATION_SIGNER_STATUSES)[number];

export const CHAIN_ATTESTATION_SIGNER_REASONS = [
  "active",
  "rotation",
  "superseded",
  "expired",
  "compromise",
  "operator",
  "schema_mismatch",
  "unavailable",
  "inconsistent",
] as const;
export type ChainAttestationSignerReasonClass = (typeof CHAIN_ATTESTATION_SIGNER_REASONS)[number];

export const CHAIN_ATTESTATION_SIGNER_PUBLIC_FIELDS = [
  "key_id",
  "algorithm",
  "public_verifier",
  "fingerprint",
  "environment",
  "status",
  "issued_at",
  "not_before",
  "expires_at",
  "allowed_networks",
  "allowed_gate_types",
  "schema_versions",
  "reason_class",
] as const;

export const CHAIN_ATTESTATION_SIGNER_DOCUMENT_FIELDS = [
  "document",
  "algorithm",
  "environment",
  "schema_versions",
  "notice",
  "keys",
] as const;

export const CHAIN_ATTESTATION_SIGNER_NOTICE =
  "Abraxas stops issuing with a retiring or revoked attestation signer. Partners update their own gate. A compromised private key cannot be recovered. Verifying a signature is not a grant.";

export const CHAIN_ATTESTATION_SIGNER_OPERATOR_STEPS = [
  "Publish the new signer public verifier and opaque key ID in the chain-attestation signer registry as active.",
  "Configure the matching environment-only private key. Never reuse a receipt signing key.",
  "Issue new attestations only with the active in-window key that matches environment, network, gate type, and schema.",
  "Mark the previous key retiring so existing short-lived attestations still verify until historical_verify_until.",
  "Partners apply an owner/admin signer-update transaction on their own contract or program. Abraxas never broadcasts it.",
  "After overlap, retire the old key. Revoke only for compromise. Revoked keys never issue or verify.",
] as const;

export interface ChainAttestationSignerRecord {
  signer_ref: string;
  key_id: string;
  algorithm: ChainAttestationSignerAlgorithm;
  environment: ChainAttestationSignerEnvironment;
  public_verifier: string;
  fingerprint: `0x${string}`;
  allowed_networks: string[];
  allowed_gate_types: Array<"evm" | "solana">;
  schema_versions: string[];
  status: ChainAttestationSignerStatus;
  reason_class: ChainAttestationSignerReasonClass;
  issued_at: string;
  not_before: string;
  expires_at: string | null;
  allow_historical_verification: boolean;
  historical_verify_until: string | null;
}

export interface ChainAttestationSignerPublicView {
  key_id: string;
  algorithm: ChainAttestationSignerAlgorithm;
  public_verifier: string;
  fingerprint: string;
  environment: ChainAttestationSignerEnvironment;
  status: ChainAttestationSignerStatus;
  issued_at: string;
  not_before: string;
  expires_at: string | null;
  allowed_networks: string[];
  allowed_gate_types: Array<"evm" | "solana">;
  schema_versions: string[];
  reason_class: ChainAttestationSignerReasonClass;
}

export interface ChainAttestationSignerDocument {
  document: typeof CHAIN_ATTESTATION_SIGNER_DOCUMENT;
  algorithm: ChainAttestationSignerAlgorithm;
  environment: ChainAttestationSignerEnvironment;
  schema_versions: string[];
  notice: typeof CHAIN_ATTESTATION_SIGNER_NOTICE;
  keys: ChainAttestationSignerPublicView[];
}

export interface SignerUpdatePackage {
  update_ref: string;
  deployment_ref: string;
  gate_type: "evm" | "solana";
  network_id: string;
  required_signer_key_ids: string[];
  public_verifiers: Array<{ key_id: string; public_verifier: string; fingerprint: string }>;
  deadline: string;
  status: "signer_update_required" | "signer_revoked";
  live: false;
  broadcasts: false;
}

export type ChainAttestationSignerResolveReason =
  | "ok"
  | "unknown_key"
  | "wrong_environment"
  | "wrong_network"
  | "unsupported_gate"
  | "not_yet_valid"
  | "expired"
  | "revoked"
  | "schema_mismatch"
  | "unavailable"
  | "inconsistent"
  | "historical_not_allowed";
