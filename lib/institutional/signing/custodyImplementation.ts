// Executable custody decision for institutional signing. Not a runtime authority source.

import { AWS_KMS_ED25519 } from "./awsKmsEd25519";

/**
 * Primary reference custody for Production institutional keys (issuer anchor + status signer).
 * Optional: not required for protocol verification or portable receipts.
 */
export const PRIMARY_INSTITUTIONAL_CUSTODY = {
  id: "aws_kms_ecc_nist_edwards25519",
  keySpec: AWS_KMS_ED25519.keySpec,
  signingAlgorithm: AWS_KMS_ED25519.signingAlgorithm,
  messageType: AWS_KMS_ED25519.messageType,
  digestBytes: AWS_KMS_ED25519.digestBytes,
  adapterModule: "awsKmsClient.ts",
  mandatoryForProtocol: false,
  estimatedRecurringUsd:
    "≈USD 2/month for 2 CMKs + USD 0.15 per 10k asymmetric Sign (see AWS_KMS_PUBLISHED_COST)",
  selectionRationale:
    "Smallest operational path with hardware-backed non-exportability and an adapter already bound to "
    + "CustodyClient + independent verifier; replaceable without protocol changes.",
} as const;

/** Self-hosted alternate when sovereignty outweighs managed KMS ops (requires PKCS#11 adapter + hardware). */
export const ALTERNATE_SELF_HOSTED_CUSTODY = {
  id: "pkcs11_yubihsm2_ed25519",
  status: "not_implemented",
  mandatoryForProtocol: false,
  procurementNote: "YubiHSM 2 or equivalent PKCS#11 HSM with Ed25519 RAW/digest contract validation required",
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
