import { describe, expect, it, vi } from "vitest";
import nacl from "tweetnacl";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { CustodyClient } from "./contract";
import { openInstitutionalSigner } from "./institutionalSigner";
import * as statusVersionCheckpoint from "@/lib/persistence/boundary/trustDistribution/statusVersionCheckpoint";
import { publishAuthoritativeReceiptStatus } from "./recordedWorkflow";
import { createServerRuntimeStatusPublishAuthorization } from "./statusPublishAuthorization.server";
import type { SignedIssuerAuthorityStatement } from "@abraxas/independent-verifier";

function memoryCustody(key: ReturnType<typeof generateTestSigningKeyPair>, identityId: string): CustodyClient {
  const pair = nacl.sign.keyPair.fromSeed(Buffer.from(key.privateKeyJwk.d!, "base64url"));
  return {
    identityId,
    keyId: `memory:${identityId}`,
    async getPublicKey() {
      return { keySpec: "ECC_NIST_EDWARDS25519", publicKey: pair.publicKey };
    },
    async signRawDigest(message) {
      return nacl.sign.detached(message, pair.secretKey);
    },
  };
}

describe("publishAuthoritativeReceiptStatus authorization contract", () => {
  it("rejects omitted authorization before checkpoint mutation", async () => {
    const versionSpy = vi.spyOn(statusVersionCheckpoint, "nextSignedStatusVersion");
    const anchor = generateTestSigningKeyPair("omit-auth-anchor");
    const statusKey = generateTestSigningKeyPair("omit-auth-status");
    const opened = await openInstitutionalSigner({
      provider: "memory",
      environment: "demo",
      anchorKeyId: anchor.signingKeyId,
      statusSignerKeyId: statusKey.signingKeyId,
      publicKeys: { issuer_anchor: anchor.publicKeyJwk, status_signer: statusKey.publicKeyJwk },
      issuer: memoryCustody(anchor, "issuer"),
      status: memoryCustody(statusKey, "status"),
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const result = await publishAuthoritativeReceiptStatus({
      env: {},
      status: opened.status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: "00000000-0000-4000-8000-000000000001",
      signedIssuerAuthority: {} as SignedIssuerAuthorityStatement,
      statusPublishAuthorization: undefined as never,
    });
    expect(result.ok).toBe(false);
    expect(versionSpy).not.toHaveBeenCalled();
    versionSpy.mockRestore();
  });

  it("rejects forged internal_trusted authorization", async () => {
    const versionSpy = vi.spyOn(statusVersionCheckpoint, "nextSignedStatusVersion");
    const anchor = generateTestSigningKeyPair("forge-auth-anchor");
    const statusKey = generateTestSigningKeyPair("forge-auth-status");
    const opened = await openInstitutionalSigner({
      provider: "memory",
      environment: "demo",
      anchorKeyId: anchor.signingKeyId,
      statusSignerKeyId: statusKey.signingKeyId,
      publicKeys: { issuer_anchor: anchor.publicKeyJwk, status_signer: statusKey.publicKeyJwk },
      issuer: memoryCustody(anchor, "issuer"),
      status: memoryCustody(statusKey, "status"),
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const result = await publishAuthoritativeReceiptStatus({
      env: {},
      status: opened.status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: "00000000-0000-4000-8000-000000000002",
      signedIssuerAuthority: {} as SignedIssuerAuthorityStatement,
      statusPublishAuthorization: { kind: "internal_trusted" } as never,
    });
    expect(result.ok).toBe(false);
    expect(versionSpy).not.toHaveBeenCalled();
    versionSpy.mockRestore();
  });

  it("issues a server runtime seal that cannot be structurally forged", () => {
    const sealed = createServerRuntimeStatusPublishAuthorization();
    const forged = { kind: "server_runtime" as const, seal: Symbol("forged") };
    expect(sealed.kind).toBe("server_runtime");
    expect(forged).not.toEqual(sealed);
  });
});
