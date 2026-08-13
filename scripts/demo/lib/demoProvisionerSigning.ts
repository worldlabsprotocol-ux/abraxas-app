// FILE: scripts/demo/lib/demoProvisionerSigning.ts
// Demo signing-key validation and JWT issuance for the offline provisioner.

import { createHash } from "node:crypto";
import { SignJWT, importJWK } from "jose";
import {
  assertDemoSigningKeyBootstrapConfigured,
  EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT,
} from "./expectedDemoSigningKeyThumbprint";
import { KNOWN_PRODUCTION_SIGNING_KEY_THUMBPRINTS } from "./knownProductionSigningKeyThumbprints";
import {
  DEMO_CREDENTIAL_TTL_DAYS,
  DEMO_SYNTHETIC_DOCUMENT_TYPE,
  DEMO_SYNTHETIC_JURISDICTION,
} from "./demoProvisionerConfig";

export class DemoProvisionerSigningError extends Error {
  readonly code:
    | "signing_key_missing"
    | "signing_key_malformed"
    | "signing_key_production_denied"
    | "signing_key_thumbprint_mismatch"
    | "expected_thumbprint_missing";

  constructor(
    code: DemoProvisionerSigningError["code"],
    message: string,
  ) {
    super(message);
    this.name = "DemoProvisionerSigningError";
    this.code = code;
  }
}

export function canonicalPublicJwkThumbprint(publicJwk: JsonWebKey): string {
  const canonical = JSON.stringify({
    crv: publicJwk.crv,
    kty: publicJwk.kty,
    x: publicJwk.x,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function publicJwkFromPrivateJwk(privateJwk: JsonWebKey): JsonWebKey {
  if (!privateJwk.x || !privateJwk.kty || !privateJwk.crv) {
    throw new DemoProvisionerSigningError(
      "signing_key_malformed",
      "Signing key JWK is missing required public fields",
    );
  }
  return {
    kty: privateJwk.kty,
    crv: privateJwk.crv,
    x: privateJwk.x,
  };
}

function expectedThumbprint(): string {
  assertDemoSigningKeyBootstrapConfigured();
  return EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT!.trim().toLowerCase();
}

export function validateDemoSigningKeyJson(signingKeyJson: string): {
  privateJwk: JsonWebKey;
  thumbprint: string;
} {
  if (!signingKeyJson.trim()) {
    throw new DemoProvisionerSigningError(
      "signing_key_missing",
      "ABRAXAS_SIGNING_KEY is required for apply",
    );
  }

  if (!EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT?.trim()) {
    throw new DemoProvisionerSigningError(
      "expected_thumbprint_missing",
      "Demo signing key bootstrap is not configured",
    );
  }

  let privateJwk: JsonWebKey;
  try {
    privateJwk = JSON.parse(signingKeyJson) as JsonWebKey;
  } catch {
    throw new DemoProvisionerSigningError(
      "signing_key_malformed",
      "ABRAXAS_SIGNING_KEY is not valid JSON",
    );
  }

  if (!privateJwk.d || privateJwk.kty !== "OKP" || privateJwk.crv !== "Ed25519") {
    throw new DemoProvisionerSigningError(
      "signing_key_malformed",
      "ABRAXAS_SIGNING_KEY must be an Ed25519 private JWK",
    );
  }

  const publicJwk = publicJwkFromPrivateJwk(privateJwk);
  const thumbprint = canonicalPublicJwkThumbprint(publicJwk);

  if (
    (KNOWN_PRODUCTION_SIGNING_KEY_THUMBPRINTS as readonly string[]).includes(thumbprint)
  ) {
    throw new DemoProvisionerSigningError(
      "signing_key_production_denied",
      "Signing key thumbprint matches a denied production key",
    );
  }

  if (thumbprint !== expectedThumbprint()) {
    throw new DemoProvisionerSigningError(
      "signing_key_thumbprint_mismatch",
      "Signing key thumbprint does not match the reviewed demo environment thumbprint",
    );
  }

  return { privateJwk, thumbprint };
}

export async function signSyntheticIdentityCredential(input: {
  signingKeyJson: string;
  subjectId: string;
  provisionId: string;
  issuer: string;
  now?: Date;
}): Promise<{
  jti: string;
  jwt: string;
  expiresAt: Date;
  jurisdiction: string;
  documentType: string;
}> {
  const { privateJwk } = validateDemoSigningKeyJson(input.signingKeyJson);
  const signingKey = await importJWK(privateJwk, "EdDSA");
  const now = input.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + DEMO_CREDENTIAL_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const jti = `urn:uuid:${input.provisionId}`;
  const jurisdiction = DEMO_SYNTHETIC_JURISDICTION;
  const documentType = DEMO_SYNTHETIC_DOCUMENT_TYPE;

  const claims = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "AbraxasIdentityCredential"],
    issuer: input.issuer,
    issuanceDate: now.toISOString(),
    expirationDate: expiresAt.toISOString(),
    id: jti,
    credentialSubject: {
      id: `did:sui:${input.subjectId}`,
      sui_address: input.subjectId,
      jurisdiction,
      document_type: documentType,
      verification_level: "standard" as const,
      world_id_verified: false,
      verified_at: now.toISOString(),
      chain: "sui" as const,
      assurance_level: "L2" as const,
      idv_provider: "manual",
      review_id: input.provisionId,
      synthetic_demo_holder: true,
      permissions: {
        fiat_offramp: true,
        defi_access: true,
        rwa_tokenize: true,
        cross_border: true,
      },
    },
  };

  const jwt = await new SignJWT({ vc: claims })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setJti(jti)
    .setIssuer(input.issuer)
    .setSubject(`did:sui:${input.subjectId}`)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(signingKey);

  return {
    jti,
    jwt,
    expiresAt,
    jurisdiction,
    documentType,
  };
}

export function signingKeySafeErrorMessage(error: unknown): string {
  if (error instanceof DemoProvisionerSigningError) {
    return error.message;
  }
  return "Signing key validation failed";
}

/** Redact JWK material from error strings. */
export function redactSigningKeyMaterial(text: string): string {
  return text
    .replace(/"d"\s*:\s*"[^"]+"/g, '"d":"<redacted>"')
    .replace(/"x"\s*:\s*"[^"]+"/g, '"x":"<redacted>"');
}
