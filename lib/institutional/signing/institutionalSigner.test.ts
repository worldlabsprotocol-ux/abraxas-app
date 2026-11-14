import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import nacl from "tweetnacl";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  verifyEd25519Detached,
  verifySignedIssuerAuthorityStatement,
  verifySignedReceiptStatusStatement,
  type IssuerAuthorityStatementPayload,
  type ReceiptStatusStatementPayload,
} from "@abraxas/independent-verifier";
import { generateTestSigningKeyPair, signReceiptPayload, verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import { authorityStateDigest, hashAuthorityChangeAuthorization, INITIAL_ISSUER_REGISTRY_VERSION } from "./authorityChange";
import { AWS_KMS_ED25519, AWS_KMS_ED25519_INCOMPATIBLE, AWS_KMS_PUBLISHED_COST, ed25519SpkiFromRawPublicKey } from "./awsKmsEd25519";
import { bindAwsKmsEd25519Client, type AwsKmsCommandClient } from "./awsKmsClient";
import type { CustodyClient } from "./contract";
import { LIVE_AWS_KMS_REQUIRED_ENV_VARS } from "./awsKmsLiveTestEnv";
import { issuerAnchorIamPolicy, SHARED_PROCESS_CUSTODY_LIMIT, statusSignerIamPolicy } from "./iamPolicy";
import { openInstitutionalSigner, type StatusStatementSigner } from "./institutionalSigner";

function ed25519() {
  const pair = nacl.sign.keyPair();
  return {
    seed: pair.secretKey.slice(0, 32),
    publicKey: pair.publicKey,
    publicJwk: { kty: "OKP", crv: "Ed25519", x: Buffer.from(pair.publicKey).toString("base64url") } as JsonWebKey,
    sign(message: Uint8Array) {
      return nacl.sign.detached(message, pair.secretKey);
    },
  };
}

function custody(input: {
  key: ReturnType<typeof ed25519>;
  identityId: string;
  keyId: string;
  calls: Array<{ identityId: string; op: string }>;
  publicKey?: Uint8Array;
  keySpec?: string;
  signature?: Uint8Array | (() => never);
}): CustodyClient {
  return {
    identityId: input.identityId,
    keyId: input.keyId,
    async getPublicKey() {
      input.calls.push({ identityId: input.identityId, op: "getPublicKey" });
      return {
        keySpec: input.keySpec ?? "ECC_NIST_EDWARDS25519",
        publicKey: input.publicKey ?? input.key.publicKey,
      };
    },
    async signRawDigest(message) {
      input.calls.push({ identityId: input.identityId, op: "sign" });
      if (typeof input.signature === "function") return input.signature();
      if (input.signature) return input.signature;
      return input.key.sign(message);
    },
  };
}

function issuerPayload(
  anchor: JsonWebKey,
  status: JsonWebKey,
  version = INITIAL_ISSUER_REGISTRY_VERSION,
  environment: "demo" | "production" = "demo",
): IssuerAuthorityStatementPayload {
  return {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: version,
    supersedes_registry_version: version === INITIAL_ISSUER_REGISTRY_VERSION ? null : version - 1,
    environment,
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: "demo-compatibility-anchor",
    keys: [{
      key_id: "demo-receipt-key",
      environment: "demo",
      status: "active",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: null,
      public_jwk: anchor,
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

async function openDemo(input?: {
  issuer?: ReturnType<typeof ed25519>;
  status?: ReturnType<typeof ed25519>;
  calls?: Array<{ identityId: string; op: string }>;
  issuerClient?: CustodyClient;
  statusClient?: CustodyClient;
  environment?: "demo" | "production";
  provider?: "memory" | "aws-kms";
}) {
  const issuer = input?.issuer ?? ed25519();
  const status = input?.status ?? ed25519();
  const calls = input?.calls ?? [];
  const opened = await openInstitutionalSigner({
    provider: input?.provider ?? "memory",
    environment: input?.environment ?? "demo",
    anchorKeyId: "demo-compatibility-anchor",
    statusSignerKeyId: "demo-status-signer",
    publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
    issuer: input?.issuerClient ?? custody({ key: issuer, identityId: "demo-issuer-role", keyId: "key/issuer", calls }),
    status: input?.statusClient ?? custody({ key: status, identityId: "demo-status-role", keyId: "key/status", calls }),
  });
  if (!opened.ok) throw new Error(opened.reason);
  return { issuer, status, calls, opened };
}

describe("authorized institutional documents", () => {
  it("signs the constructed issuer and status documents, and the independent verifier accepts them", async () => {
    const { issuer, status, calls, opened } = await openDemo();
    const payload = issuerPayload(issuer.publicJwk, status.publicJwk);
    const signed = await opened.issuer.signIssuerAuthorityStatement(payload);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(verifySignedIssuerAuthorityStatement({
      statement: signed.statement,
      trustAnchorPublicJwk: issuer.publicJwk,
    }).ok).toBe(true);
    expect(calls.filter((call) => call.op === "sign").map((call) => call.identityId)).toEqual(["demo-issuer-role"]);

    const statusSigned = await opened.status.signReceiptStatusStatement(statusPayload());
    expect(statusSigned.ok).toBe(true);
    if (!statusSigned.ok) return;
    expect(verifySignedReceiptStatusStatement({
      signedStatus: statusSigned.statement,
      signedIssuerAuthority: signed.statement,
      now: new Date("2026-06-02T00:00:00.000Z"),
    })).toEqual({ ok: true });
    expect(calls.filter((call) => call.op === "sign").map((call) => call.identityId)).toEqual([
      "demo-issuer-role",
      "demo-status-role",
    ]);
    expect(JSON.stringify(signed)).not.toContain(Buffer.from(issuer.seed).toString("base64url"));
  });

  it("rejects the other document, a forged digest, and a stale registry proposal before signing", async () => {
    const calls: Array<{ identityId: string; op: string }> = [];
    const { issuer, status, opened } = await openDemo({ calls });
    const payload = issuerPayload(issuer.publicJwk, status.publicJwk);
    const signCount = () => calls.filter((call) => call.op === "sign").length;

    expect(await opened.issuer.signIssuerAuthorityStatement(statusPayload() as unknown as IssuerAuthorityStatementPayload))
      .toEqual({ ok: false, reason: "unauthorized_institutional_action" });
    expect(await opened.status.signReceiptStatusStatement(payload as unknown as ReceiptStatusStatementPayload))
      .toEqual({ ok: false, reason: "unauthorized_institutional_action" });
    expect("signAuthorityChangeApproval" in opened.status).toBe(false);
    expect("signIssuerAuthorityStatement" in opened.status).toBe(false);
    const statusOnly: StatusStatementSigner = opened.status;
    expect(statusOnly.role).toBe("status_signer");

    const forged = await opened.issuer.signAuthorityChangeApproval({
      retained: null,
      proposed: payload,
      assertedAuthorityStateDigest: "0".repeat(64),
    });
    expect(forged).toEqual({ ok: false, reason: "authority_state_digest_mismatch" });

    const retainedDigest = authorityStateDigest(payload);
    const changed: IssuerAuthorityStatementPayload = {
      ...payload,
      registry_version: INITIAL_ISSUER_REGISTRY_VERSION + 1,
      supersedes_registry_version: INITIAL_ISSUER_REGISTRY_VERSION - 1,
      keys: payload.keys.map((key) => ({ ...key, status: "retiring" })),
    };
    expect(await opened.issuer.signAuthorityChangeApproval({
      retained: { registryVersion: INITIAL_ISSUER_REGISTRY_VERSION, authorityStateDigest: retainedDigest },
      proposed: changed,
      assertedAuthorityStateDigest: authorityStateDigest(changed),
    })).toEqual({ ok: false, reason: "stale_authority_approval" });

    const unbound = { ...changed, supersedes_registry_version: INITIAL_ISSUER_REGISTRY_VERSION, registry_version: INITIAL_ISSUER_REGISTRY_VERSION + 2 };
    expect(await opened.issuer.signAuthorityChangeApproval({
      retained: { registryVersion: INITIAL_ISSUER_REGISTRY_VERSION, authorityStateDigest: retainedDigest },
      proposed: unbound,
      assertedAuthorityStateDigest: authorityStateDigest(unbound),
    })).toEqual({ ok: false, reason: "authority_approval_not_bound" });

    const sameState = {
      ...payload,
      registry_version: INITIAL_ISSUER_REGISTRY_VERSION + 1,
      supersedes_registry_version: INITIAL_ISSUER_REGISTRY_VERSION,
    };
    expect(await opened.issuer.signAuthorityChangeApproval({
      retained: { registryVersion: INITIAL_ISSUER_REGISTRY_VERSION, authorityStateDigest: retainedDigest },
      proposed: sameState,
      assertedAuthorityStateDigest: authorityStateDigest(sameState),
    })).toEqual({ ok: false, reason: "authority_state_unchanged" });
    expect(signCount()).toBe(0);

    const approved = await opened.issuer.signAuthorityChangeApproval({
      retained: { registryVersion: INITIAL_ISSUER_REGISTRY_VERSION, authorityStateDigest: retainedDigest },
      proposed: { ...changed, supersedes_registry_version: INITIAL_ISSUER_REGISTRY_VERSION },
      assertedAuthorityStateDigest: authorityStateDigest(changed),
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.authorization.authority_state_digest).toBe(authorityStateDigest(changed));
    expect(approved.authorization.change).toBe("authority_change");
    expect(approved.authorization.supersedes_registry_version).toBe(INITIAL_ISSUER_REGISTRY_VERSION);
    expect(verifyEd25519Detached({
      message: Buffer.from(hashAuthorityChangeAuthorization(approved.authorization), "hex"),
      signatureBase64Url: approved.signature,
      publicJwk: issuer.publicJwk,
    })).toBe(true);
    expect(verifyEd25519Detached({
      message: Buffer.from(approved.payload_hash, "hex"),
      signatureBase64Url: approved.signature,
      publicJwk: status.publicJwk,
    })).toBe(false);
    expect(calls.filter((call) => call.op === "sign").map((call) => call.identityId)).toEqual(["demo-issuer-role"]);
  });

  it("rejects a substituted public key, a shared identity, and exportable production keys", async () => {
    const issuer = ed25519();
    const status = ed25519();
    const calls: Array<{ identityId: string; op: string }> = [];
    const substituted = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "production",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: ed25519().publicJwk, status_signer: status.publicJwk },
      issuer: custody({ key: issuer, identityId: "prod-issuer-role", keyId: "arn:issuer", calls }),
      status: custody({ key: status, identityId: "prod-status-role", keyId: "arn:status", calls }),
    });
    expect(substituted).toEqual({ ok: false, reason: "kms_public_key_mismatch" });
    expect(calls.some((call) => call.op === "sign")).toBe(false);

    const shared = custody({ key: issuer, identityId: "one-role", keyId: "arn:issuer", calls });
    expect(await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "production",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      issuer: shared,
      status: custody({ key: status, identityId: "one-role", keyId: "arn:status", calls }),
    })).toEqual({ ok: false, reason: "signing_identities_must_be_separate" });

    expect(await openInstitutionalSigner({ provider: "exportable-jwk", environment: "production" })).toEqual({
      ok: false,
      reason: "production_exportable_key_forbidden",
    });
    expect(await openInstitutionalSigner({
      provider: "memory",
      environment: "production",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      issuer: custody({ key: issuer, identityId: "issuer", keyId: "issuer", calls }),
      status: custody({ key: status, identityId: "status", keyId: "status", calls }),
    })).toEqual({ ok: false, reason: "production_exportable_key_forbidden" });
  });

  it("fails closed on a custody outage or a malformed signature and does not read a private JWK", async () => {
    const issuer = ed25519();
    const status = ed25519();
    const previous = process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK;
    process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK = JSON.stringify({ d: "fallback-seed" });
    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "production",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      issuer: custody({
        key: issuer,
        identityId: "prod-issuer-role",
        keyId: "arn:issuer",
        calls: [],
        signature: () => { throw new Error("kms unavailable"); },
      }),
      status: custody({
        key: status,
        identityId: "prod-status-role",
        keyId: "arn:status",
        calls: [],
        signature: new Uint8Array(63),
      }),
    });
    if (!opened.ok) throw new Error(opened.reason);
    const outage = await opened.issuer.signIssuerAuthorityStatement(
      issuerPayload(issuer.publicJwk, status.publicJwk, INITIAL_ISSUER_REGISTRY_VERSION, "production"),
    );
    const malformed = await opened.status.signReceiptStatusStatement({ ...statusPayload(), environment: "production" });
    if (previous === undefined) delete process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK;
    else process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK = previous;
    expect(outage).toEqual({ ok: false, reason: "institutional_signer_unavailable" });
    expect(malformed).toEqual({ ok: false, reason: "signature_material_invalid" });
    expect(JSON.stringify(outage)).not.toContain("fallback-seed");
    expect(JSON.stringify(malformed)).not.toContain("fallback-seed");

    await expect(openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      issuer: custody({
        key: issuer,
        identityId: "demo-issuer-role",
        keyId: "key/issuer",
        calls: [],
        signature: undefined,
      }),
      status: {
        identityId: "demo-status-role",
        keyId: "key/status",
        async getPublicKey() { throw new Error("kms unavailable"); },
        async signRawDigest() { return new Uint8Array(64); },
      },
    })).resolves.toEqual({ ok: false, reason: "institutional_signer_unavailable" });
  });

  it("keeps receipt signing on abraxas-primary and gives each role its own IAM policy", async () => {
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

    for (const file of [
      "lib/decisionReceipts/signing.ts",
      "lib/partner/trustExecution/executeTrustExecutionAuthoritative.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain("signAuthorityChangeApproval");
      expect(source).not.toContain("institutional/signing");
    }
    const implementation = [
      "contract.ts",
      "authorityChange.ts",
      "iamPolicy.ts",
      "awsKmsEd25519.ts",
      "awsKmsClient.ts",
      "institutionalSigner.ts",
    ].map((file) => readFileSync(join(__dirname, file), "utf8")).join("\n");
    expect(implementation).not.toContain("ABRAXAS_SIGNING_KEY");
    expect(implementation).not.toContain("ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK");
    expect(implementation).not.toContain("process.env");

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

    const issuerArn = "arn:aws:kms:us-east-1:111122223333:key/issuer";
    const statusArn = "arn:aws:kms:us-east-1:111122223333:key/status";
    const issuerPolicy = issuerAnchorIamPolicy(issuerArn);
    const statusPolicy = statusSignerIamPolicy(statusArn);
    expect(JSON.stringify(issuerPolicy)).not.toContain(statusArn);
    expect(JSON.stringify(statusPolicy)).not.toContain(issuerArn);
    expect(JSON.stringify(issuerPolicy)).not.toContain("kms:*");
    expect(issuerPolicy.Statement[0].Condition).toEqual({ StringEquals: { "kms:SigningAlgorithm": AWS_KMS_ED25519.signingAlgorithm } });
    expect(statusPolicy.Statement.map((statement) => statement.Action).flat()).toEqual(["kms:Sign", "kms:GetPublicKey"]);
    expect(() => issuerAnchorIamPolicy("arn:aws:kms:us-east-1:111122223333:key/*")).toThrow("institutional_kms_key_arn_required");
    expect(SHARED_PROCESS_CUSTODY_LIMIT).toContain("both roles' credentials");
    expect(AWS_KMS_ED25519_INCOMPATIBLE.signingAlgorithm).toBe("ED25519_PH_SHA_512");
    expect(AWS_KMS_PUBLISHED_COST.asymmetricSignExcludedFromFreeTier).toBe(true);
  });
});

describe("live AWS KMS env contract", () => {
  it("names isolated credential variables required before a live KMS proof", () => {
    expect(LIVE_AWS_KMS_REQUIRED_ENV_VARS).toContain("ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID");
    expect(LIVE_AWS_KMS_REQUIRED_ENV_VARS).toContain("ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY");
    expect(LIVE_AWS_KMS_REQUIRED_ENV_VARS).not.toContain("AWS_ACCESS_KEY_ID");
  });
});

describe("AWS SDK adapter request shape, not a live KMS call", () => {
  it("sends GetPublicKey and RAW ED25519_SHA_512, then verifies the returned raw signature", async () => {
    const issuer = ed25519();
    const status = ed25519();
    const seen: Array<{ name: string; input: { KeyId?: string; Message?: Uint8Array; MessageType?: string; SigningAlgorithm?: string } }> = [];
    const fake = (key: ReturnType<typeof ed25519>, keyId: string): AwsKmsCommandClient => ({
      async send(command) {
        if (command instanceof GetPublicKeyCommand) {
          seen.push({ name: "GetPublicKey", input: command.input });
          return { KeySpec: "ECC_NIST_EDWARDS25519", PublicKey: ed25519SpkiFromRawPublicKey(key.publicKey) };
        }
        if (command instanceof SignCommand) {
          seen.push({ name: "Sign", input: command.input });
          return {
            SigningAlgorithm: "ED25519_SHA_512",
            Signature: key.sign(command.input.Message as Uint8Array),
          };
        }
        throw new Error(`unexpected command for ${keyId}`);
      },
    });
    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      issuer: bindAwsKmsEd25519Client({ identityId: "issuer-role/demo", keyId: "arn:issuer", kms: fake(issuer, "arn:issuer") }),
      status: bindAwsKmsEd25519Client({ identityId: "status-role/demo", keyId: "arn:status", kms: fake(status, "arn:status") }),
    });
    if (!opened.ok) throw new Error(opened.reason);
    const payload = issuerPayload(issuer.publicJwk, status.publicJwk);
    const signed = await opened.issuer.signIssuerAuthorityStatement(payload);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(verifySignedIssuerAuthorityStatement({
      statement: signed.statement,
      trustAnchorPublicJwk: issuer.publicJwk,
    }).ok).toBe(true);
    const signCall = seen.find((call) => call.name === "Sign");
    expect(signCall?.input.KeyId).toBe("arn:issuer");
    expect(signCall?.input.MessageType).toBe("RAW");
    expect(signCall?.input.SigningAlgorithm).toBe("ED25519_SHA_512");
    expect(signCall?.input.Message).toHaveLength(32);
    expect(seen.some((call) => call.name === "GetPublicKey" && call.input.KeyId === "arn:status")).toBe(true);
    expect(seen.filter((call) => call.name === "Sign").map((call) => call.input.KeyId)).toEqual(["arn:issuer"]);
  });

  it("rejects a KMS public key that does not match the configured JWK and a prehash algorithm response", async () => {
    const issuer = ed25519();
    const status = ed25519();
    const signs: string[] = [];
    const fake = (key: ReturnType<typeof ed25519>, algorithm: string): AwsKmsCommandClient => ({
      async send(command) {
        if (command instanceof GetPublicKeyCommand) {
          return { KeySpec: "ECC_NIST_EDWARDS25519", PublicKey: ed25519SpkiFromRawPublicKey(key.publicKey) };
        }
        signs.push(algorithm);
        return { SigningAlgorithm: algorithm, Signature: key.sign(command.input.Message as Uint8Array) };
      },
    });
    const mismatch = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: ed25519().publicJwk, status_signer: status.publicJwk },
      issuer: bindAwsKmsEd25519Client({ identityId: "issuer-role/demo", keyId: "arn:issuer", kms: fake(issuer, "ED25519_SHA_512") }),
      status: bindAwsKmsEd25519Client({ identityId: "status-role/demo", keyId: "arn:status", kms: fake(status, "ED25519_SHA_512") }),
    });
    expect(mismatch).toEqual({ ok: false, reason: "kms_public_key_mismatch" });
    expect(signs).toEqual([]);

    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "demo-compatibility-anchor",
      statusSignerKeyId: "demo-status-signer",
      publicKeys: { issuer_anchor: issuer.publicJwk, status_signer: status.publicJwk },
      issuer: bindAwsKmsEd25519Client({
        identityId: "issuer-role/demo",
        keyId: "arn:issuer",
        kms: fake(issuer, "ED25519_PH_SHA_512"),
      }),
      status: bindAwsKmsEd25519Client({ identityId: "status-role/demo", keyId: "arn:status", kms: fake(status, "ED25519_SHA_512") }),
    });
    if (!opened.ok) throw new Error(opened.reason);
    expect(await opened.issuer.signIssuerAuthorityStatement(issuerPayload(issuer.publicJwk, status.publicJwk)))
      .toEqual({ ok: false, reason: "signature_material_invalid" });
  });
});
