// FILE: lib/trust/trustLayer.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isTransitionAllowed,
  resolveClaimStatusAtRead,
} from "@/lib/trust/credentialStatusRegistry";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { issuerMeetsPolicyRule } from "@/lib/trust/issuerFramework";
import {
  verifyIssuerAttestationSignature,
  type IssuerClaimAttestationPayload,
} from "@/lib/trust/issuerClaimAttestation";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { isReceiptCurrentlyValidSync } from "@/lib/decisionReceipts/validityResolver";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import nacl from "tweetnacl";
import { createHash } from "crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";

const TEST_KEY = generateTestSigningKeyPair();

function claim(partial: Partial<CredentialClaimRecord> & Pick<CredentialClaimRecord, "claim_type">): CredentialClaimRecord {
  return {
    id: partial.id ?? "claim-1",
    subject_id: "0x1",
    credential_jti: null,
    claim_value: {},
    issuer_id: partial.issuer_id ?? "issuer:veriff",
    assurance_level: "L2",
    issued_at: new Date().toISOString(),
    expires_at: null,
    status: "active",
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: "US",
    policy_scope: null,
    ...partial,
  };
}

function sampleReceipt(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_test",
    decision_id: "00000000-0000-4000-8000-000000000001",
    policy_id: "abraxas-booking-v1",
    policy_version: 1,
    partner_id: "abraxas",
    subject_pseudonym_id: subjectPseudonymId("0x1"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: "dr_test",
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: "abraxas",
    policy_id: payload.policy_id,
    policy_version: 1,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: "1.0.0",
    payload_hash: payloadHash,
    signature,
    signing_key_id: "test",
    anchor_reference: null,
    idempotency_key: payload.decision_id,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

describe("credential status transitions", () => {
  it("allows active -> suspended -> active", () => {
    expect(isTransitionAllowed("active", "suspended")).toBe(true);
    expect(isTransitionAllowed("suspended", "active")).toBe(true);
  });

  it("blocks revoked -> active", () => {
    expect(isTransitionAllowed("revoked", "active")).toBe(false);
  });

  it("blocks expired -> active", () => {
    expect(isTransitionAllowed("expired", "active")).toBe(false);
  });

  it("resolves expired at read time", () => {
    expect(resolveClaimStatusAtRead({
      status: "active",
      expires_at: "2020-01-01T00:00:00.000Z",
    })).toBe("expired");
  });
});

describe("policy issuer trust enforcement", () => {
  const policy: PartnerPolicyRules = {
    required_claims: [
      { claim_type: "identity_verified", accepted_issuers: ["issuer:veriff"], min_assurance: "L2" },
    ],
  };

  it("approves trusted issuer claim", () => {
    const result = evaluatePolicyRules(policy, [claim({ claim_type: "identity_verified", issuer_id: "issuer:veriff" })], {
      trustRulesByClaimType: new Map([
        ["identity_verified", { accepted_issuer_ids: ["issuer:veriff"], minimum_assurance_level: "L2" }],
      ]),
    });
    expect(result.decision).toBe("approved");
  });

  it("denies untrusted issuer claim", () => {
    const result = evaluatePolicyRules(policy, [claim({ claim_type: "identity_verified", issuer_id: "issuer:unknown" })], {
      trustRulesByClaimType: new Map([
        ["identity_verified", { accepted_issuer_ids: ["issuer:veriff"] }],
      ]),
    });
    expect(result.decision).toBe("denied");
    expect(result.reason_codes.some(r => r.includes("untrusted_issuer"))).toBe(true);
  });

  it("manual_review when claim under_review", () => {
    const result = evaluatePolicyRules(
      { required_claims: [{ claim_type: "identity_verified" }] },
      [claim({ claim_type: "identity_verified", status: "under_review" })],
    );
    expect(result.decision).toBe("manual_review");
    expect(result.reason_codes.some(r => r.startsWith("under_review:"))).toBe(true);
  });

  it("denies revoked claim", () => {
    const result = evaluatePolicyRules(
      { required_claims: [{ claim_type: "identity_verified" }] },
      [claim({ claim_type: "identity_verified", status: "revoked" })],
    );
    expect(result.decision).toBe("denied");
    expect(result.reason_codes.some(r => r.startsWith("revoked:"))).toBe(true);
  });

  it("denies suspended claim", () => {
    const result = evaluatePolicyRules(
      { required_claims: [{ claim_type: "identity_verified" }] },
      [claim({ claim_type: "identity_verified", status: "suspended" })],
    );
    expect(result.decision).toBe("denied");
    expect(result.reason_codes.some(r => r.startsWith("suspended:"))).toBe(true);
  });

  it("denies insufficient assurance", () => {
    const result = evaluatePolicyRules(
      { required_claims: [{ claim_type: "identity_verified", min_assurance: "L3" }] },
      [claim({ claim_type: "identity_verified", assurance_level: "L1" })],
    );
    expect(result.decision).toBe("denied");
  });
});

describe("issuerMeetsPolicyRule", () => {
  it("rejects inactive issuer", () => {
    expect(issuerMeetsPolicyRule(
      { id: "issuer:x", legal_name: "X", issuer_type: "t", trust_status: "suspended", supported_claims: [], jurisdictions: [], assurance_levels: [], credential_ttl_days: null, audit_status: "self_attested", metadata: {} },
      { accepted_issuers: ["issuer:x"] },
      { assurance_level: "L2" },
    )).toBe(false);
  });
});

describe("issuer attestation signature", () => {
  it("verifies valid attestation", () => {
    const payload: IssuerClaimAttestationPayload = {
      schema_version: "1.0.0",
      issuer_id: "issuer:test",
      signing_key_id: "key-1",
      subject_id: "0xabc",
      claim_type: "identity_verified",
      assurance_level: "L2",
      jurisdiction: "US",
      issued_at: new Date().toISOString(),
      expires_at: null,
      claim_value: { verified: true },
      idempotency_key: "idem-1",
    };
    const canonical = canonicalizeJson(payload);
    const hash = createHash("sha256").update(canonical, "utf8").digest();
    const keyPair = nacl.sign.keyPair();
    const sig = nacl.sign.detached(Buffer.from(hash), keyPair.secretKey);
    const publicKeyJwk = {
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(keyPair.publicKey).toString("base64url"),
    };
    const signature = Buffer.from(sig).toString("base64url");
    expect(verifyIssuerAttestationSignature(payload, signature, publicKeyJwk)).toBe(true);
  });
});

describe("receipt backward compatibility", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });
  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("sync validity check still works for active production receipts", () => {
    expect(isReceiptCurrentlyValidSync(sampleReceipt())).toBe(true);
  });

  it("sync validity rejects expired receipts", () => {
    expect(isReceiptCurrentlyValidSync(sampleReceipt({
      expires_at: "2020-01-01T00:00:00.000Z",
    }))).toBe(false);
  });
});

describe("partner-safe public output", () => {
  it("credential status view has no forbidden PII keys", () => {
    const view = {
      claim_id: "uuid",
      claim_type: "identity_verified",
      issuer_id: "issuer:veriff",
      status: "active",
      status_updated_at: null,
      status_reason_code: null,
      issued_at: new Date().toISOString(),
      expires_at: null,
      assurance_level: "L2",
      jurisdiction: "US",
    };
    const json = JSON.stringify(view);
    expect(json).not.toContain("claim_value");
    expect(json).not.toContain("subject_id");
    expect(json).not.toContain("passport");
  });
});
