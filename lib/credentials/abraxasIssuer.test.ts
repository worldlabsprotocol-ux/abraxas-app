import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_TRUSTED_ABRAXAS_ISSUER,
  extractIssuerFromCredentialJwt,
  resolveAbraxasCredentialIssuer,
  trustedAbraxasCredentialIssuers,
} from "@/lib/credentials/abraxasIssuer";
import { SITE_URL } from "@/lib/siteUrl";
import { SignJWT, importJWK } from "jose";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

const ENV_KEY = "ABRAXAS_ISSUER_URL";
let savedIssuerUrl: string | undefined;

function clearIssuerEnv() {
  savedIssuerUrl = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
}

function restoreIssuerEnv() {
  if (savedIssuerUrl === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = savedIssuerUrl;
  }
}

describe("resolveAbraxasCredentialIssuer", () => {
  beforeEach(() => clearIssuerEnv());
  afterEach(() => restoreIssuerEnv());

  it("defaults to canonical production origin when configuration is absent", () => {
    expect(resolveAbraxasCredentialIssuer()).toBe(SITE_URL);
    expect(resolveAbraxasCredentialIssuer()).toBe("https://abraxasworld.xyz");
    expect(resolveAbraxasCredentialIssuer()).not.toContain("abraxas-app.vercel.app");
  });

  it("honors ABRAXAS_ISSUER_URL for local and preview issuance", () => {
    process.env.ABRAXAS_ISSUER_URL = "http://localhost:3000/";
    expect(resolveAbraxasCredentialIssuer()).toBe("http://localhost:3000");

    process.env.ABRAXAS_ISSUER_URL = "https://preview-branch.vercel.app";
    expect(resolveAbraxasCredentialIssuer()).toBe("https://preview-branch.vercel.app");
  });
});

describe("trustedAbraxasCredentialIssuers", () => {
  beforeEach(() => clearIssuerEnv());
  afterEach(() => restoreIssuerEnv());

  it("includes canonical issuer and documented legacy issuer", () => {
    expect(trustedAbraxasCredentialIssuers()).toEqual(
      expect.arrayContaining([SITE_URL, LEGACY_TRUSTED_ABRAXAS_ISSUER]),
    );
  });

  it("includes configured preview issuer without replacing legacy compatibility", () => {
    process.env.ABRAXAS_ISSUER_URL = "https://preview.example.com";
    const issuers = trustedAbraxasCredentialIssuers();
    expect(issuers).toContain("https://preview.example.com");
    expect(issuers).toContain(LEGACY_TRUSTED_ABRAXAS_ISSUER);
    expect(issuers).not.toContain("https://evil.example.com");
  });
});

describe("extractIssuerFromCredentialJwt", () => {
  const testKey = generateTestSigningKeyPair();

  async function signJwtWithIssuer(issuer: string): Promise<string> {
    const signingKey = await importJWK(testKey.privateKeyJwk, "EdDSA");
    return new SignJWT({ vc: { issuer } })
      .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
      .setIssuer(issuer)
      .setSubject("did:sui:0xabc")
      .setIssuedAt(new Date())
      .setExpirationTime(new Date(Date.now() + 60_000))
      .sign(signingKey);
  }

  it("returns iss from a credential JWT", async () => {
    const jwt = await signJwtWithIssuer(LEGACY_TRUSTED_ABRAXAS_ISSUER);
    expect(extractIssuerFromCredentialJwt(jwt)).toBe(LEGACY_TRUSTED_ABRAXAS_ISSUER);
  });

  it("returns null for malformed JWT input", () => {
    expect(extractIssuerFromCredentialJwt("not-a-jwt")).toBeNull();
  });
});
