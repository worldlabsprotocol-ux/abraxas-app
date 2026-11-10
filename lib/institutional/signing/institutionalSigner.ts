// FILE: lib/institutional/signing/institutionalSigner.ts
// Signs one authorized digest with one role. Does not read private JWKs, create keys,
// change a registry, or sign decision receipts.

import { awsKmsRawDigestSignInput, type RawEd25519SignClient } from "./awsKmsEd25519";
import {
  purposeAllowed,
  publicEd25519Jwk,
  type InstitutionalSigningFailureReason,
  type InstitutionalSigningRole,
  type SignInstitutionalDigestRequest,
  type SignInstitutionalDigestResult,
} from "./contract";

export type InstitutionalSigner = {
  environment: "demo" | "production";
  signDigest(request: SignInstitutionalDigestRequest): Promise<SignInstitutionalDigestResult>;
};

type OpenInstitutionalSignerResult =
  | { ok: true; signer: InstitutionalSigner }
  | { ok: false; reason: InstitutionalSigningFailureReason };

type RoleMaterial = {
  keyId: string;
  publicJwk: JsonWebKey;
  sign(message: Uint8Array): Promise<Uint8Array>;
};

export type InstitutionalSignerConfig =
  | {
      provider: "memory";
      environment: "demo" | "production";
      publicKeys: Record<InstitutionalSigningRole, JsonWebKey>;
      signers: Record<InstitutionalSigningRole, (message: Uint8Array) => Uint8Array>;
    }
  | {
      provider: "aws-kms";
      environment: "demo" | "production";
      keyIds: Record<InstitutionalSigningRole, string>;
      publicKeys: Record<InstitutionalSigningRole, JsonWebKey>;
      client: RawEd25519SignClient;
    }
  | {
      provider: "exportable-jwk";
      environment: "demo" | "production";
    };

function separatedPublicKeys(publicKeys: Record<InstitutionalSigningRole, JsonWebKey>):
  | { ok: true; issuer: JsonWebKey; status: JsonWebKey }
  | { ok: false; reason: InstitutionalSigningFailureReason } {
  const issuer = publicEd25519Jwk(publicKeys.issuer_anchor);
  if (!issuer.ok) return issuer;
  const status = publicEd25519Jwk(publicKeys.status_signer);
  if (!status.ok) return status;
  if (issuer.jwk.x === status.jwk.x) return { ok: false, reason: "signing_roles_must_be_separate" };
  return { ok: true, issuer: issuer.jwk, status: status.jwk };
}

function unavailable(): SignInstitutionalDigestResult {
  return { ok: false, reason: "institutional_signer_unavailable" };
}

function createSigner(environment: "demo" | "production", roles: Record<InstitutionalSigningRole, RoleMaterial>): InstitutionalSigner {
  return {
    environment,
    async signDigest(request) {
      if (request.environment !== environment) return { ok: false, reason: "environment_mismatch" };
      if (!purposeAllowed(request.role, request.purpose)) return { ok: false, reason: "unauthorized_signing_purpose" };
      const prepared = awsKmsRawDigestSignInput({ keyId: roles[request.role].keyId, digest: request.digest });
      if (!prepared.ok) return prepared;
      let signature: Uint8Array;
      try {
        signature = await roles[request.role].sign(prepared.request.message);
      } catch {
        return unavailable();
      }
      if (signature.byteLength !== 64) return { ok: false, reason: "signature_material_invalid" };
      return {
        ok: true,
        role: request.role,
        purpose: request.purpose,
        signature_base64url: Buffer.from(signature).toString("base64url"),
        public_jwk: roles[request.role].publicJwk,
      };
    },
  };
}

export function openInstitutionalSigner(config: InstitutionalSignerConfig): OpenInstitutionalSignerResult {
  if (config.provider === "exportable-jwk") {
    return {
      ok: false,
      reason: config.environment === "production" ? "production_exportable_key_forbidden" : "exportable_jwk_not_a_signer",
    };
  }
  if (config.provider === "memory" && config.environment !== "demo") {
    return { ok: false, reason: "production_exportable_key_forbidden" };
  }

  const keys = separatedPublicKeys(config.publicKeys);
  if (!keys.ok) return keys;

  if (config.provider === "memory") {
    if (config.signers.issuer_anchor === config.signers.status_signer) {
      return { ok: false, reason: "signing_roles_must_be_separate" };
    }
    return {
      ok: true,
      signer: createSigner("demo", {
        issuer_anchor: {
          keyId: "memory:issuer_anchor",
          publicJwk: keys.issuer,
          sign: async (message) => config.signers.issuer_anchor(message),
        },
        status_signer: {
          keyId: "memory:status_signer",
          publicJwk: keys.status,
          sign: async (message) => config.signers.status_signer(message),
        },
      }),
    };
  }

  const issuerKeyId = config.keyIds.issuer_anchor.trim();
  const statusKeyId = config.keyIds.status_signer.trim();
  if (!issuerKeyId || !statusKeyId || issuerKeyId === statusKeyId) {
    return { ok: false, reason: issuerKeyId && statusKeyId ? "signing_roles_must_be_separate" : "institutional_signer_not_configured" };
  }
  const client = config.client;
  return {
    ok: true,
    signer: createSigner(config.environment, {
      issuer_anchor: {
        keyId: issuerKeyId,
        publicJwk: keys.issuer,
        sign: async (message) => client.sign({
          keyId: issuerKeyId,
          message,
          signingAlgorithm: "ED25519_SHA_512",
          messageType: "RAW",
        }),
      },
      status_signer: {
        keyId: statusKeyId,
        publicJwk: keys.status,
        sign: async (message) => client.sign({
          keyId: statusKeyId,
          message,
          signingAlgorithm: "ED25519_SHA_512",
          messageType: "RAW",
        }),
      },
    }),
  };
}
