// Executable custody decision for institutional signing. Not a runtime authority source.

import { AWS_KMS_ED25519 } from "./awsKmsEd25519";

/**
 * Optional managed-cloud custody (AWS KMS). Not required for protocol verification or portable receipts.
 */
export const OPTIONAL_AWS_KMS_CUSTODY = {
  id: "aws_kms_ecc_nist_edwards25519",
  keySpec: AWS_KMS_ED25519.keySpec,
  signingAlgorithm: AWS_KMS_ED25519.signingAlgorithm,
  messageType: AWS_KMS_ED25519.messageType,
  digestBytes: AWS_KMS_ED25519.digestBytes,
  adapterModule: "awsKmsClient.ts",
  mandatoryForProtocol: false,
  hardwareNonExportable: true,
  estimatedRecurringUsd:
    "≈USD 2/month for 2 CMKs + USD 0.15 per 10k asymmetric Sign (see AWS_KMS_PUBLISHED_COST)",
  selectionRationale:
    "One supported hardware-backed adapter; replaceable without protocol or receipt changes.",
} as const;

/** @deprecated Use OPTIONAL_AWS_KMS_CUSTODY — AWS is not a protocol mandatory dependency. */
export const PRIMARY_INSTITUTIONAL_CUSTODY = OPTIONAL_AWS_KMS_CUSTODY;

/**
 * Self-hosted software-protected keys (NP demonstration). Not equivalent to hardware non-exportability.
 * Set ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER=self-hosted-file and seed file paths on the worker host.
 */
export const SELF_HOSTED_SOFTWARE_CUSTODY = {
  id: "self_hosted_ed25519_seed_file",
  adapterModule: "softwareEd25519Custody.ts",
  mandatoryForProtocol: false,
  hardwareNonExportable: false,
  allowedEnvironments: ["demo"] as const,
  env: {
    provider: "ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER=self-hosted-file",
    issuerSeed: "ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH",
    statusSeed: "ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH",
  },
  honesty:
    "Software-only; suitable for sovereign NP demos and portable-receipt verification drills — not institutional hardware custody.",
} as const;

/** Hardware self-hosted alternate (PKCS#11). Future adapter; same CustodyClient contract. */
export const ALTERNATE_HARDWARE_SELF_HOSTED_CUSTODY = {
  id: "pkcs11_yubihsm2_ed25519",
  status: "not_implemented",
  mandatoryForProtocol: false,
  hardwareNonExportable: true,
  procurementNote: "YubiHSM 2 or equivalent PKCS#11 HSM with Ed25519 RAW/digest contract validation required",
} as const;

/** @deprecated Use ALTERNATE_HARDWARE_SELF_HOSTED_CUSTODY */
export const ALTERNATE_SELF_HOSTED_CUSTODY = ALTERNATE_HARDWARE_SELF_HOSTED_CUSTODY;

export const EVALUATED_VAULT_TRANSIT_CUSTODY = {
  id: "hashicorp_vault_transit_ed25519",
  status: "not_bound",
  mandatoryForProtocol: false,
  note:
    "Vault Transit can host Ed25519 signing with a dedicated adapter; treat as software/service custody unless backed by HSM integration.",
} as const;

/**
 * Governance operator keys stay outside issuer/status custody (wallet or separate HSM).
 * Governed by governanceTrustPin + dual signatures, not by institutional CustodyClient roles.
 */
export const GOVERNANCE_CUSTODY_MODEL = {
  id: "operator_controlled_ed25519",
  storage: "outside receipt runtime and outside issuer/status KMS identities",
  publicPin: "sovereign_postgres_issuer_governance_trust_pin",
} as const;

export const INSTITUTIONAL_WORKER_ENV_FLAG = "ABRAXAS_INSTITUTIONAL_SIGNING_WORKER" as const;
export const GOVERNANCE_OPERATOR_PG_URL_ENV_NAME = "ABRAXAS_GOVERNANCE_OPERATOR_PG_URL" as const;

export const SIGNING_DEPLOYMENT_MODEL = {
  /** Public Vercel receipt runtime must not hold CustodyClient credentials. */
  publicAppHostsCustody: false,
  /**
   * A separate OS process or host for institutional signing is required for Production,
   * but it should call CustodyClient in-process against KMS/HSM — not expose signRawDigest over RPC.
   */
  isolatedInstitutionalProcessRequired: true,
  networkRawDigestSigningForbidden: true,
  permittedRemoteOperations: [
    "signIssuerAuthorityStatement",
    "signReceiptStatusStatement",
    "signAuthorityChangeApproval",
  ] as const,
} as const;
