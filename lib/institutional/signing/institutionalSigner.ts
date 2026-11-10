// FILE: lib/institutional/signing/institutionalSigner.ts
// Each method constructs or checks one canonical document, then signs that document's digest.
// There is no public digest-and-purpose operation.

import {
  hashIssuerAuthorityPayload,
  hashReceiptStatusStatementPayload,
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  type IssuerAuthorityStatementPayload,
  type ReceiptStatusStatementPayload,
  type SignedIssuerAuthorityStatement,
  type SignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import { AWS_KMS_ED25519 } from "./awsKmsEd25519";
import {
  buildAuthorityChangeAuthorization,
  hashAuthorityChangeAuthorization,
  type IssuerAuthorityChangeAuthorization,
  type RetainedAuthoritySnapshot,
} from "./authorityChange";
import {
  CustodyResponseError,
  publicEd25519Jwk,
  publicKeyMaterialCarriesPrivateSeed,
  type CustodyClient,
  type InstitutionalSigningFailureReason,
} from "./contract";

type SigningFailure = { ok: false; reason: InstitutionalSigningFailureReason };

export type IssuerAnchorSigner = {
  readonly role: "issuer_anchor";
  readonly identityId: string;
  readonly keyId: string;
  readonly environment: "demo" | "production";
  readonly publicJwk: JsonWebKey;
  signIssuerAuthorityStatement(
    payload: IssuerAuthorityStatementPayload,
  ): Promise<{ ok: true; statement: SignedIssuerAuthorityStatement } | SigningFailure>;
  signAuthorityChangeApproval(input: {
    retained: RetainedAuthoritySnapshot | null;
    proposed: IssuerAuthorityStatementPayload;
    assertedAuthorityStateDigest: string;
  }): Promise<
    | { ok: true; authorization: IssuerAuthorityChangeAuthorization; signature: string; payload_hash: string }
    | SigningFailure
  >;
};

export type StatusStatementSigner = {
  readonly role: "status_signer";
  readonly identityId: string;
  readonly keyId: string;
  readonly environment: "demo" | "production";
  readonly publicJwk: JsonWebKey;
  signReceiptStatusStatement(
    payload: ReceiptStatusStatementPayload,
  ): Promise<{ ok: true; statement: SignedReceiptStatusStatement } | SigningFailure>;
};

export type OpenedInstitutionalSigning =
  | { ok: true; issuer: IssuerAnchorSigner; status: StatusStatementSigner }
  | SigningFailure;

export type InstitutionalSignerConfig =
  | {
      provider: "memory" | "aws-kms";
      environment: "demo" | "production";
      anchorKeyId: string;
      statusSignerKeyId: string;
      publicKeys: { issuer_anchor: JsonWebKey; status_signer: JsonWebKey };
      issuer: CustodyClient;
      status: CustodyClient;
    }
  | {
      provider: "exportable-jwk";
      environment: "demo" | "production";
    };

async function signBoundDigest(client: CustodyClient, digest: Uint8Array): Promise<
  { ok: true; signature: string } | SigningFailure
> {
  if (digest.byteLength !== AWS_KMS_ED25519.digestBytes) return { ok: false, reason: "digest_must_be_32_bytes" };
  try {
    const signature = await client.signRawDigest(Uint8Array.from(digest));
    if (signature.byteLength !== AWS_KMS_ED25519.signatureBytes) {
      return { ok: false, reason: "signature_material_invalid" };
    }
    return { ok: true, signature: Buffer.from(signature).toString("base64url") };
  } catch (error) {
    if (error instanceof CustodyResponseError) return { ok: false, reason: error.reason };
    return { ok: false, reason: "institutional_signer_unavailable" };
  }
}

function statementEnvironment(payload: { environment: string }, environment: "demo" | "production"): SigningFailure | null {
  if (payload.environment !== environment) return { ok: false, reason: "environment_mismatch" };
  return null;
}

export async function openInstitutionalSigner(config: InstitutionalSignerConfig): Promise<OpenedInstitutionalSigning> {
  if (config.provider === "exportable-jwk") {
    return {
      ok: false,
      reason: config.environment === "production" ? "production_exportable_key_forbidden" : "exportable_jwk_not_a_signer",
    };
  }
  if (config.provider === "memory" && config.environment !== "demo") {
    return { ok: false, reason: "production_exportable_key_forbidden" };
  }
  const anchorKeyId = config.anchorKeyId.trim();
  const statusSignerKeyId = config.statusSignerKeyId.trim();
  if (!anchorKeyId || !statusSignerKeyId || anchorKeyId === statusSignerKeyId) {
    return { ok: false, reason: "institutional_signer_not_configured" };
  }
  if (
    config.issuer === config.status
    || !config.issuer.identityId.trim()
    || !config.status.identityId.trim()
    || config.issuer.identityId.trim() === config.status.identityId.trim()
    || !config.issuer.keyId.trim()
    || !config.status.keyId.trim()
    || config.issuer.keyId.trim() === config.status.keyId.trim()
  ) {
    return {
      ok: false,
      reason: config.issuer.identityId.trim() && config.issuer.identityId.trim() === config.status.identityId.trim()
        ? "signing_identities_must_be_separate"
        : "signing_roles_must_be_separate",
    };
  }

  const issuerJwk = publicEd25519Jwk(config.publicKeys.issuer_anchor);
  if (!issuerJwk.ok) return issuerJwk;
  const statusJwk = publicEd25519Jwk(config.publicKeys.status_signer);
  if (!statusJwk.ok) return statusJwk;
  if (issuerJwk.jwk.x === statusJwk.jwk.x) return { ok: false, reason: "signing_roles_must_be_separate" };

  const bound = await bindPublicKey(config.issuer, issuerJwk.jwk);
  if (!bound.ok) return bound;
  const statusBound = await bindPublicKey(config.status, statusJwk.jwk);
  if (!statusBound.ok) return statusBound;

  const environment = config.environment;
  const issuerClient = config.issuer;
  const statusClient = config.status;
  return {
    ok: true,
    issuer: {
      role: "issuer_anchor",
      identityId: issuerClient.identityId.trim(),
      keyId: issuerClient.keyId.trim(),
      environment,
      publicJwk: issuerJwk.jwk,
      async signIssuerAuthorityStatement(payload) {
        if (payload.document !== ISSUER_AUTHORITY_STATEMENT_DOCUMENT) {
          return { ok: false, reason: "unauthorized_institutional_action" };
        }
        if (payload.schema_version !== ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION) {
          return { ok: false, reason: "authority_document_invalid" };
        }
        if (publicKeyMaterialCarriesPrivateSeed(payload)) {
          return { ok: false, reason: "public_key_must_not_carry_private_material" };
        }
        const environmentCheck = statementEnvironment(payload, environment);
        if (environmentCheck) return environmentCheck;
        if (payload.anchor_key_id !== anchorKeyId) return { ok: false, reason: "anchor_key_mismatch" };
        const payloadHash = hashIssuerAuthorityPayload(payload);
        const signed = await signBoundDigest(issuerClient, Buffer.from(payloadHash, "hex"));
        if (!signed.ok) return signed;
        return {
          ok: true,
          statement: {
            payload,
            payload_hash: payloadHash,
            signature: signed.signature,
            anchor_key_id: payload.anchor_key_id,
          },
        };
      },
      async signAuthorityChangeApproval(input) {
        const built = buildAuthorityChangeAuthorization({
          environment,
          anchorKeyId,
          anchorPublicJwk: issuerJwk.jwk,
          retained: input.retained,
          proposed: input.proposed,
          assertedAuthorityStateDigest: input.assertedAuthorityStateDigest,
        });
        if (!built.ok) return built;
        const payloadHash = hashAuthorityChangeAuthorization(built.authorization);
        const signed = await signBoundDigest(issuerClient, Buffer.from(payloadHash, "hex"));
        if (!signed.ok) return signed;
        return {
          ok: true,
          authorization: built.authorization,
          signature: signed.signature,
          payload_hash: payloadHash,
        };
      },
    },
    status: {
      role: "status_signer",
      identityId: statusClient.identityId.trim(),
      keyId: statusClient.keyId.trim(),
      environment,
      publicJwk: statusJwk.jwk,
      async signReceiptStatusStatement(payload) {
        if (payload.document !== RECEIPT_STATUS_STATEMENT_DOCUMENT) {
          return { ok: false, reason: "unauthorized_institutional_action" };
        }
        if (payload.schema_version !== RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION) {
          return { ok: false, reason: "authority_document_invalid" };
        }
        const environmentCheck = statementEnvironment(payload, environment);
        if (environmentCheck) return environmentCheck;
        if (payload.status_signer_key_id !== statusSignerKeyId) {
          return { ok: false, reason: "status_signer_mismatch" };
        }
        const payloadHash = hashReceiptStatusStatementPayload(payload);
        const signed = await signBoundDigest(statusClient, Buffer.from(payloadHash, "hex"));
        if (!signed.ok) return signed;
        return {
          ok: true,
          statement: {
            payload,
            payload_hash: payloadHash,
            signature: signed.signature,
            status_signer_key_id: payload.status_signer_key_id,
          },
        };
      },
    },
  };
}

async function bindPublicKey(client: CustodyClient, configured: JsonWebKey): Promise<{ ok: true } | SigningFailure> {
  try {
    const actual = await client.getPublicKey();
    if (actual.keySpec !== AWS_KMS_ED25519.keySpec) return { ok: false, reason: "kms_key_spec_mismatch" };
    if (actual.publicKey.byteLength !== 32) return { ok: false, reason: "kms_public_key_mismatch" };
    if (Buffer.from(actual.publicKey).toString("base64url") !== configured.x) {
      return { ok: false, reason: "kms_public_key_mismatch" };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof CustodyResponseError) return { ok: false, reason: error.reason };
    return { ok: false, reason: "institutional_signer_unavailable" };
  }
}
