import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  hashIssuerAuthorityPayload,
  hashReceiptStatusStatementPayload,
  verifyEd25519Detached,
  verifySignedIssuerAuthorityStatement,
  verifySignedReceiptStatusStatement,
  type IssuerAuthorityStatementPayload,
  type ReceiptStatusStatementPayload,
} from "@abraxas/independent-verifier";
import { generateTestSigningKeyPair, signReceiptPayload, verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import { AWS_KMS_ED25519, AWS_KMS_ED25519_INCOMPATIBLE, AWS_KMS_PUBLISHED_COST, type AwsKmsRawDigestSignInput } from "./awsKmsEd25519";
import { openInstitutionalSigner } from "./institutionalSigner";

function ed25519() {
  const pair = nacl.sign.keyPair();
  const seed = pair.secretKey.slice(0, 32);
  return {
    seed,
    publicJwk: { kty: "OKP", crv: "Ed25519", x: Buffer.from(pair.publicKey).toString("base64url") } as JsonWebKey,
    sign(message: Uint8Array) {
      return nacl.sign.detached(message, pair.secretKey);
    },
  };
}

function digestOf(value: unknown): Uint8Array {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest();
}

function memorySigner() {
  const issuer = ed25519();
  const status = ed25519();
  const opened = openInstitutionalSigner({
    provider: "memory",
    environment: "demo",
    publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
    signers: { issuer_anchor: issuer.sign, status_signer: status.sign },
  });
  if (!opened.ok) throw new Error(opened.reason);
  return { issuer, status, signer: opened.signer };
}

function issuerPayload(issuer: JsonWebKey, status: JsonWebKey): IssuerAuthorityStatementPayload {
  return {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: 854,
    supersedes_registry_version: null,
    environment: "demo",
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: "demo-compatibility-anchor",
    keys: [{
      key_id: "demo-receipt-key",
      environment: "demo",
      status: "active",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: null,
      public_jwk: issuer,
      schema_versions: ["1.0.0"],
      allow_historical_verification: false,
      historical_verify_until: null,
      reason_class: "active",
    }],
    status_signers: [{
      key_id: "demo-status-signer",
      environment: "demo",
      status: "active",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: null,
      public_jwk: status,
      reason_class: "active",
    }],
  };
}

function statusPayload(): ReceiptStatusStatementPayload {
  return {
    document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
    schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
    receipt_id: "receipt-demo-1",
    status_reference: "receipt-demo-1",
    partner_id: "partner-demo",
    policy_id: "policy-demo",
    policy_version: 1,
    environment: "demo",
    status_version: 1,
    supersedes_status_version: null,
    receipt_status: "active",
    superseded: false,
    partner_operational: true,
    policy_active: true,
    claims_current: true,
    evidence_current: true,
    effective_at: "2026-06-01T00:00:00.000Z",
    issued_at: "2026-06-01T00:00:00.000Z",
    statement_expires_at: "2027-06-01T00:00:00.000Z",
    status_signer_key_id: "demo-status-signer",
  };
}

describe("non-exportable institutional signing", () => {
  it("signs the exact 32-byte digest and the independent verifier accepts it", async () => {
    const { issuer, status, signer } = memorySigner();
    const payload = issuerPayload(issuer.publicJwk, status.publicJwk);
    const payloadHash = hashIssuerAuthorityPayload(payload);
    const signed = await signer.signDigest({
      role: "issuer_anchor",
      purpose: "issuer_authority_statement",
      environment: "demo",
      digest: Buffer.from(payloadHash, "hex"),
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(Object.keys(signed.public_jwk).sort()).toEqual(["crv", "kty", "x"]);
    expect(JSON.stringify(signed)).not.toContain(Buffer.from(issuer.seed).toString("base64url"));
    const direct = issuer.sign(Buffer.from(payloadHash, "hex"));
    expect(signed.signature_base64url).toBe(Buffer.from(direct).toString("base64url"));
    expect(verifyEd25519Detached({
      message: Buffer.from(payloadHash, "hex"),
      signatureBase64Url: signed.signature_base64url,
      publicJwk: issuer.publicJwk,
    })).toBe(true);
    expect(verifySignedIssuerAuthorityStatement({
      statement: {
        payload,
        payload_hash: payloadHash,
        signature: signed.signature_base64url,
        anchor_key_id: payload.anchor_key_id,
      },
      trustAnchorPublicJwk: issuer.publicJwk,
      acceptedRegistryVersion: 854,
      expectedAuthorityStateDigest: undefined,
    }).ok).toBe(true);

    const statusBody = statusPayload();
    const statusHash = hashReceiptStatusStatementPayload(statusBody);
    const statusSigned = await signer.signDigest({
      role: "status_signer",
      purpose: "receipt_status_statement",
      environment: "demo",
      digest: Buffer.from(statusHash, "hex"),
    });
    expect(statusSigned.ok).toBe(true);
    if (!statusSigned.ok) return;
    expect(verifySignedReceiptStatusStatement({
      signedStatus: {
        payload: statusBody,
        payload_hash: statusHash,
        signature: statusSigned.signature_base64url,
        status_signer_key_id: statusBody.status_signer_key_id,
      },
      signedIssuerAuthority: {
        payload,
        payload_hash: payloadHash,
        signature: signed.signature_base64url,
        anchor_key_id: payload.anchor_key_id,
      },
      now: new Date("2026-06-02T00:00:00.000Z"),
    })).toEqual({ ok: true });
  });

  it("rejects a wrong key, a modified payload, and a prehashed signature", async () => {
    const { issuer, status, signer } = memorySigner();
    const payload = issuerPayload(issuer.publicJwk, status.publicJwk);
    const payloadHash = hashIssuerAuthorityPayload(payload);
    const signed = await signer.signDigest({
      role: "issuer_anchor",
      purpose: "issuer_authority_statement",
      environment: "demo",
      digest: Buffer.from(payloadHash, "hex"),
    });
    if (!signed.ok) throw new Error(signed.reason);
    expect(verifyEd25519Detached({
      message: Buffer.from(payloadHash, "hex"),
      signatureBase64Url: signed.signature_base64url,
      publicJwk: status.publicJwk,
    })).toBe(false);
    const modified = { ...payload, issued_at: "2026-06-02T00:00:00.000Z" };
    expect(verifySignedIssuerAuthorityStatement({
      statement: {
        payload: modified,
        payload_hash: payloadHash,
        signature: signed.signature_base64url,
        anchor_key_id: modified.anchor_key_id,
      },
      trustAnchorPublicJwk: issuer.publicJwk,
    })).toEqual({ ok: false, reason: "statement_payload_hash_mismatch" });

    const digest = Buffer.from(payloadHash, "hex");
    const prehashed = createHash("sha512").update(digest).digest();
    const prehashSignature = Buffer.from(issuer.sign(prehashed)).toString("base64url");
    expect(verifyEd25519Detached({
      message: digest,
      signatureBase64Url: prehashSignature,
      publicJwk: issuer.publicJwk,
    })).toBe(false);
    expect(AWS_KMS_ED25519).toMatchObject({ signingAlgorithm: "ED25519_SHA_512", messageType: "RAW", digestBytes: 32 });
    expect(AWS_KMS_ED25519_INCOMPATIBLE).toEqual({ signingAlgorithm: "ED25519_PH_SHA_512", messageType: "DIGEST" });
  });

  it("refuses the wrong role before any signature and keeps registry approval explicit", async () => {
    const calls: AwsKmsRawDigestSignInput[] = [];
    const issuer = ed25519();
    const status = ed25519();
    const opened = openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      keyIds: { issuer_anchor: "arn:aws:kms:us-east-1:000:key/issuer", status_signer: "arn:aws:kms:us-east-1:000:key/status" },
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      client: {
        async sign(input) {
          calls.push(input);
          const key = input.keyId.endsWith("issuer") ? issuer : status;
          return key.sign(input.message);
        },
      },
    });
    if (!opened.ok) throw new Error(opened.reason);
    const authorization = digestOf({ document: "abraxas_issuer_authority_change", action: "authority_change" });
    const swapped = await opened.signer.signDigest({
      role: "status_signer",
      purpose: "authority_change_authorization",
      environment: "demo",
      digest: authorization,
    });
    const issuerOnStatus = await opened.signer.signDigest({
      role: "issuer_anchor",
      purpose: "receipt_status_statement",
      environment: "demo",
      digest: authorization,
    });
    expect(swapped).toEqual({ ok: false, reason: "unauthorized_signing_purpose" });
    expect(issuerOnStatus).toEqual({ ok: false, reason: "unauthorized_signing_purpose" });
    expect(await opened.signer.signDigest({
      role: "issuer_anchor",
      purpose: "authority_change_authorization",
      environment: "production",
      digest: authorization,
    })).toEqual({ ok: false, reason: "environment_mismatch" });
    expect(await opened.signer.signDigest({
      role: "issuer_anchor",
      purpose: "authority_change_authorization",
      environment: "demo",
      digest: new Uint8Array(31),
    })).toEqual({ ok: false, reason: "digest_must_be_32_bytes" });
    expect(calls).toHaveLength(0);

    const approved = await opened.signer.signDigest({
      role: "issuer_anchor",
      purpose: "authority_change_authorization",
      environment: "demo",
      digest: authorization,
    });
    expect(approved.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].keyId).toBe("arn:aws:kms:us-east-1:000:key/issuer");
    expect(calls[0].signingAlgorithm).toBe("ED25519_SHA_512");
    expect(calls[0].messageType).toBe("RAW");
    expect(Buffer.from(calls[0].message).equals(authorization)).toBe(true);
  });

  it("fails closed on an outage and returns no private key", async () => {
    const issuer = ed25519();
    const status = ed25519();
    const previous = process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK;
    process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK = JSON.stringify({ d: "not-a-signing-key" });
    const opened = openInstitutionalSigner({
      provider: "aws-kms",
      environment: "production",
      keyIds: { issuer_anchor: "arn:issuer", status_signer: "arn:status" },
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      client: { async sign() { throw new Error("kms unavailable"); } },
    });
    if (!opened.ok) throw new Error(opened.reason);
    const result = await opened.signer.signDigest({
      role: "issuer_anchor",
      purpose: "issuer_authority_statement",
      environment: "production",
      digest: new Uint8Array(32),
    });
    if (previous === undefined) delete process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK;
    else process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK = previous;
    expect(result).toEqual({ ok: false, reason: "institutional_signer_unavailable" });
    expect(JSON.stringify(result)).not.toContain("not-a-signing-key");
    expect(JSON.stringify(issuer.seed)).not.toBe(JSON.stringify(result));
  });

  it("refuses exportable private JWKs in production and refuses shared roles", () => {
    expect(openInstitutionalSigner({ provider: "exportable-jwk", environment: "production" })).toEqual({
      ok: false,
      reason: "production_exportable_key_forbidden",
    });
    expect(openInstitutionalSigner({ provider: "exportable-jwk", environment: "demo" })).toEqual({
      ok: false,
      reason: "exportable_jwk_not_a_signer",
    });
    const issuer = ed25519();
    expect(openInstitutionalSigner({
      provider: "memory",
      environment: "production",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: issuer.publicJwk },
      signers: { issuer_anchor: issuer.sign, status_signer: issuer.sign },
    })).toEqual({ ok: false, reason: "production_exportable_key_forbidden" });
    expect(openInstitutionalSigner({
      provider: "aws-kms",
      environment: "production",
      keyIds: { issuer_anchor: "arn:same", status_signer: "arn:same" },
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: ed25519().publicJwk },
      client: { async sign() { return new Uint8Array(64); } },
    })).toEqual({ ok: false, reason: "signing_roles_must_be_separate" });
    expect(openInstitutionalSigner({
      provider: "aws-kms",
      environment: "production",
      keyIds: { issuer_anchor: "arn:issuer", status_signer: "arn:status" },
      publicKeys: {
        issuer_anchor: { ...issuer.publicJwk, d: Buffer.from(issuer.seed).toString("base64url") },
        status_signer: ed25519().publicJwk,
      },
      client: { async sign() { return new Uint8Array(64); } },
    })).toEqual({ ok: false, reason: "public_key_must_not_carry_private_material" });
  });

  it("leaves receipt signing on abraxas-primary and exposes no signing route", async () => {
    const receiptKey = generateTestSigningKeyPair("abraxas-primary");
    const payload = {
      receipt_id: "receipt-1",
      schema_version: "1.0.0",
      decision_id: "decision-1",
      policy_id: "policy-1",
      policy_version: 1,
      partner_id: "partner-1",
      subject_pseudonym_id: "subject-1",
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved" as const,
      reason_codes: ["ok"],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production" as const,
      evaluated_at: "2026-06-01T00:00:00.000Z",
      expires_at: null,
    };
    const signed = signReceiptPayload(payload, receiptKey.privateKeyJwk);
    expect(receiptKey.signingKeyId).toBe("abraxas-primary");
    expect(verifyReceiptSignature(payload, signed.signature, receiptKey.publicKeyJwk)).toBe(true);

    const source = ["contract.ts", "awsKmsEd25519.ts", "institutionalSigner.ts"]
      .map((file) => readFileSync(join(__dirname, file), "utf8"))
      .join("\n");
    expect(source).not.toContain("ABRAXAS_SIGNING_KEY");
    expect(source).not.toContain("process.env");
    expect(readFileSync(join(process.cwd(), "lib/decisionReceipts/signing.ts"), "utf8")).toContain("ABRAXAS_SIGNING_KEY");

    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          if (readFileSync(path, "utf8").includes("institutional/signing")) hits.push(path);
        }
      }
    };
    walk(join(process.cwd(), "app"));
    expect(hits).toEqual([]);
    expect(AWS_KMS_PUBLISHED_COST).toMatchObject({
      usdPerCustomerManagedKeyMonth: 1,
      usdPer10000AsymmetricRequests: 0.15,
      asymmetricSignExcludedFromFreeTier: true,
    });
  });
});
