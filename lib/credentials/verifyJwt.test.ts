import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT, importJWK } from "jose";
import { verifyCredentialJwt } from "@/lib/credentials/verifyJwt";
import {
  LEGACY_TRUSTED_ABRAXAS_ISSUER,
  resolveAbraxasCredentialIssuer,
} from "@/lib/credentials/abraxasIssuer";
import { SITE_URL } from "@/lib/siteUrl";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

const TEST_KEY = generateTestSigningKeyPair();
const ENV_KEYS = [
  "ABRAXAS_ISSUER_URL",
  "ABRAXAS_PUBLIC_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function clearVerificationEnv() {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
}

function restoreVerificationEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
}

async function signCredentialJwt(issuer: string): Promise<string> {
  const signingKey = await importJWK(TEST_KEY.privateKeyJwk, "EdDSA");
  const jti = "urn:uuid:verify-jwt-test";
  const now = new Date();
  const claims = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "AbraxasIdentityCredential"],
    issuer,
    issuanceDate: now.toISOString(),
    expirationDate: new Date(now.getTime() + 3_600_000).toISOString(),
    id: jti,
    credentialSubject: {
      id: "did:sui:0xabc",
      sui_address: "0xabc",
      jurisdiction: "US",
      document_type: "passport",
      verification_level: "standard",
      world_id_verified: false,
      permissions: {
        fiat_offramp: true,
        defi_access: true,
        rwa_tokenize: true,
        cross_border: true,
      },
    },
  };

  return new SignJWT({ vc: claims })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setJti(jti)
    .setIssuer(issuer)
    .setSubject("did:sui:0xabc")
    .setIssuedAt(now)
    .setExpirationTime(new Date(now.getTime() + 3_600_000))
    .sign(signingKey);
}

describe("verifyCredentialJwt — issuer contract", () => {
  beforeEach(() => clearVerificationEnv());
  afterEach(() => restoreVerificationEnv());

  it("accepts credentials issued with the canonical production issuer", async () => {
    const jwt = await signCredentialJwt(SITE_URL);
    const result = await verifyCredentialJwt(jwt, "test-verifier", [], false);
    expect(result.verified).toBe(true);
    expect(result.credential_jti).toBe("urn:uuid:verify-jwt-test");
  });

  it("accepts documented legacy credentials issued on abraxas-app.vercel.app", async () => {
    const jwt = await signCredentialJwt(LEGACY_TRUSTED_ABRAXAS_ISSUER);
    const result = await verifyCredentialJwt(jwt, "test-verifier", [], false);
    expect(result.verified).toBe(true);
  });

  it("accepts credentials issued with configured preview issuer", async () => {
    process.env.ABRAXAS_ISSUER_URL = "https://preview.example.com";
    const jwt = await signCredentialJwt(resolveAbraxasCredentialIssuer());
    const result = await verifyCredentialJwt(jwt, "test-verifier", [], false);
    expect(result.verified).toBe(true);
  });

  it("rejects credentials with an untrusted issuer", async () => {
    const jwt = await signCredentialJwt("https://evil.example.com");
    const result = await verifyCredentialJwt(jwt, "test-verifier", [], false);
    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/iss/i);
  });
});
