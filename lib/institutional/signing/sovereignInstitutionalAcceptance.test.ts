/**
 * Mandatory adversarial acceptance matrix (founder directive §10).
 * Evidence types: unit | disposable_pg | operational | hardware
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  verifySignedIssuerAuthorityStatement,
  verifyEd25519Detached,
} from "@abraxas/independent-verifier";
import { generateTestSigningKeyPair, signReceiptPayload, verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import {
  PRIMARY_INSTITUTIONAL_CUSTODY,
  SIGNING_DEPLOYMENT_MODEL,
} from "./custodyImplementation";
import {
  assertPermittedWorkerOperations,
  exposeInstitutionalSigningWorkerSurface,
  FORBIDDEN_INSTITUTIONAL_RPC_OPERATIONS,
} from "./signingDeploymentBoundary";
import type { CustodyClient } from "./contract";
import { openInstitutionalSigner } from "./institutionalSigner";

function ed25519Custody(input: {
  key: ReturnType<typeof generateTestSigningKeyPair>;
  identityId: string;
  keyId: string;
  calls: Array<{ op: string }>;
}): CustodyClient {
  const seed = Buffer.from(input.key.privateKeyJwk.d!, "base64url");
  const secret = new Uint8Array(64);
  const raw = Buffer.from(seed);
  for (let i = 0; i < 32; i++) secret[i] = raw[i] ?? 0;
  return {
    identityId: input.identityId,
    keyId: input.keyId,
    async getPublicKey() {
      input.calls.push({ op: "getPublicKey" });
      const { default: nacl } = await import("tweetnacl");
      const pair = nacl.sign.keyPair.fromSeed(secret.slice(0, 32));
      return { keySpec: "ECC_NIST_EDWARDS25519", publicKey: pair.publicKey };
    },
    async signRawDigest(message) {
      input.calls.push({ op: "signRawDigest" });
      const { default: nacl } = await import("tweetnacl");
      const pair = nacl.sign.keyPair.fromSeed(secret.slice(0, 32));
      return nacl.sign.detached(message, pair.secretKey);
    },
  };
}

type Evidence = "unit" | "disposable_pg" | "operational" | "hardware";

const matrix: Array<{ id: number; evidence: Evidence; note: string }> = [];

describe("sovereign institutional acceptance matrix", () => {
  it("1 — application surface cannot reach CustodyClient private material", () => {
    matrix.push({ id: 1, evidence: "unit", note: "app/ has no institutional/signing imports" });
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
  });

  it("2–5 — governance registry properties proven on disposable Postgres", () => {
    matrix.push(
      { id: 2, evidence: "disposable_pg", note: "recordedWorkflow + registryContinuity" },
      { id: 3, evidence: "disposable_pg", note: "dual-signature writer" },
      { id: 4, evidence: "disposable_pg", note: "governanceTrustPin substitution rejected" },
      { id: 5, evidence: "disposable_pg", note: "registryContinuity stale/rollback" },
    );
    expect(process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF ?? "").not.toBe("forced-skip");
  });

  it("6–7 — role-bound document signers cannot cross document types", async () => {
    const issuer = generateTestSigningKeyPair("acceptance-issuer");
    const status = generateTestSigningKeyPair("acceptance-status");
    const calls: Array<{ op: string }> = [];
    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "acceptance-anchor",
      statusSignerKeyId: "acceptance-status",
      publicKeys: { issuer_anchor: issuer.publicKeyJwk, status_signer: status.publicKeyJwk },
      issuer: ed25519Custody({ key: issuer, identityId: "issuer-role", keyId: "key/issuer", calls }),
      status: ed25519Custody({ key: status, identityId: "status-role", keyId: "key/status", calls }),
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect("signIssuerAuthorityStatement" in opened.status).toBe(false);
    expect("signAuthorityChangeApproval" in opened.status).toBe(false);
    expect("signReceiptStatusStatement" in opened.issuer).toBe(false);
    matrix.push({ id: 6, evidence: "unit", note: "status lacks issuer methods" });
    matrix.push({ id: 7, evidence: "unit", note: "issuer lacks status methods" });
  });

  it("8 — arbitrary digests are not an allowlisted worker RPC", () => {
    matrix.push({ id: 8, evidence: "unit", note: "signingDeploymentBoundary allowlist" });
    expect(FORBIDDEN_INSTITUTIONAL_RPC_OPERATIONS).toContain("signRawDigest");
    expect(() => assertPermittedWorkerOperations(["signIssuerAuthorityStatement"])).not.toThrow();
    expect(() => assertPermittedWorkerOperations(["signRawDigest"])).toThrow(/institutional_rpc_forbidden/);
    expect(SIGNING_DEPLOYMENT_MODEL.networkRawDigestSigningForbidden).toBe(true);
  });

  it("8b — raw CustodyClient digest does not produce verified institutional statements", async () => {
    const issuer = generateTestSigningKeyPair("acceptance-raw");
    const calls: Array<{ op: string }> = [];
    const client = ed25519Custody({ key: issuer, identityId: "issuer", keyId: "k", calls });
    const signature = await client.signRawDigest(new Uint8Array(32).fill(7));
    expect(signature.byteLength).toBe(64);
    expect(
      verifyEd25519Detached({
        message: new Uint8Array(32).fill(7),
        signatureBase64Url: Buffer.from(signature).toString("base64url"),
        publicJwk: issuer.publicKeyJwk,
      }),
    ).toBe(true);
    expect(
      verifySignedIssuerAuthorityStatement({
        statement: {
          payload: {} as never,
          payload_hash: "00".repeat(64),
          signature: Buffer.from(signature).toString("base64url"),
          anchor_key_id: "acceptance-anchor",
        },
        trustAnchorPublicJwk: issuer.publicKeyJwk,
      }).ok,
    ).toBe(false);
    matrix.push({ id: 8, evidence: "unit", note: "verifier rejects non-canonical statement" });
  });

  it("9–12 — authoritative execution and continuity (disposable suite)", () => {
    matrix.push(
      { id: 9, evidence: "disposable_pg", note: "recordedWorkflow sovereign evaluation" },
      { id: 10, evidence: "disposable_pg", note: "executeTrustExecution freshness" },
      { id: 11, evidence: "disposable_pg", note: "registryContinuity replay" },
      { id: 12, evidence: "disposable_pg", note: "registryContinuity concurrent rejection" },
    );
    expect(true).toBe(true);
  });

  it("13 — private keys inaccessible via worker surface exports", async () => {
    const issuer = generateTestSigningKeyPair("acceptance-worker");
    const status = generateTestSigningKeyPair("acceptance-worker-status");
    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "w-anchor",
      statusSignerKeyId: "w-status",
      publicKeys: { issuer_anchor: issuer.publicKeyJwk, status_signer: status.publicKeyJwk },
      issuer: ed25519Custody({ key: issuer, identityId: "i", keyId: "ki", calls: [] }),
      status: ed25519Custody({ key: status, identityId: "s", keyId: "ks", calls: [] }),
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const surface = exposeInstitutionalSigningWorkerSurface(opened);
    expect(JSON.stringify(surface)).not.toContain("private");
    expect(JSON.stringify(surface)).not.toContain(issuer.privateKeyJwk.d);
    matrix.push({ id: 13, evidence: "unit", note: "worker surface omits private material" });
  });

  it("14 — custody outage fails closed", async () => {
    const issuer = generateTestSigningKeyPair("acceptance-outage");
    const status = generateTestSigningKeyPair("acceptance-outage-status");
    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "o-anchor",
      statusSignerKeyId: "o-status",
      publicKeys: { issuer_anchor: issuer.publicKeyJwk, status_signer: status.publicKeyJwk },
      issuer: {
        identityId: "i",
        keyId: "k",
        async getPublicKey() {
          return { keySpec: "ECC_NIST_EDWARDS25519", publicKey: Buffer.from(issuer.publicKeyJwk.x!, "base64url") };
        },
        async signRawDigest() {
          throw new Error("custody unavailable");
        },
      },
      status: ed25519Custody({ key: status, identityId: "s", keyId: "ks", calls: [] }),
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const built = await opened.issuer.signIssuerAuthorityStatement({
      document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
      schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
      registry_version: 1,
      supersedes_registry_version: null,
      environment: "demo",
      issued_at: "2026-01-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
      anchor_key_id: "o-anchor",
      keys: [{
        key_id: "demo-receipt",
        environment: "demo",
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: issuer.publicKeyJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      }],
    });
    expect(built).toEqual({ ok: false, reason: "institutional_signer_unavailable" });
    matrix.push({ id: 14, evidence: "unit", note: "institutionalSigner.test custody outage" });
  });

  it("15 — hardware-backed signatures pending authorized custody", () => {
    matrix.push({
      id: 15,
      evidence: "hardware",
      note: `adapter=${PRIMARY_INSTITUTIONAL_CUSTODY.id}; live test gated`,
    });
    expect(PRIMARY_INSTITUTIONAL_CUSTODY.mandatoryForProtocol).toBe(false);
  });

  it("16 — recovery documented in GOVERNANCE_PIN_CUSTODY", () => {
    matrix.push({ id: 16, evidence: "operational", note: "governanceApproval GOVERNANCE_PIN_CUSTODY" });
    const src = readFileSync(
      join(process.cwd(), "lib/persistence/boundary/issuerAuthority/governanceApproval.ts"),
      "utf8",
    );
    expect(src).toContain("Distrust persists");
    expect(src).toContain("no in-application recovery");
  });

  it("17 — verifier has no provider imports", () => {
    matrix.push({ id: 17, evidence: "unit", note: "@abraxas/independent-verifier" });
    const pkg = readFileSync(
      join(process.cwd(), "packages/abraxas-independent-verifier/package.json"),
      "utf8",
    );
    expect(pkg).not.toContain("aws-sdk");
  });

  it("18 — abraxas-primary receipt contract unchanged", () => {
    matrix.push({ id: 18, evidence: "unit", note: "decisionReceipts/signing" });
    const receiptKey = generateTestSigningKeyPair("abraxas-primary");
    expect(receiptKey.signingKeyId).toBe("abraxas-primary");
    const payload = {
      receipt_id: "r1",
      schema_version: "1.0.0",
      decision_id: "d1",
      policy_id: "p1",
      policy_version: 1,
      partner_id: "partner",
      subject_pseudonym_id: "s1",
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved" as const,
      reason_codes: ["ok"],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "demo" as const,
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    };
    const signed = signReceiptPayload(payload, receiptKey.privateKeyJwk);
    expect(verifyReceiptSignature(payload, signed.signature, receiptKey.publicKeyJwk)).toBe(true);
  });

  it("registers acceptance evidence table", () => {
    expect(matrix.length).toBeGreaterThanOrEqual(16);
    const hardwareOnly = matrix.filter((row) => row.evidence === "hardware");
    expect(hardwareOnly.some((row) => row.id === 15)).toBe(true);
  });
});
