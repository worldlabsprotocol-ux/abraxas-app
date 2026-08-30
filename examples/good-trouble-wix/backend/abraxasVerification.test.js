// FILE: examples/good-trouble-wix/backend/abraxasVerification.test.js

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ABRAXAS_ORIGIN,
  GTV_PARAM,
  NONCE_STATE,
  PARTNER_ID,
  POLICY_ID,
  RECEIPT_VALIDATION_MODE,
  RETURN_URL_BASE,
} from "./constants.js";
import {
  buildVerificationStartPayload,
  claimPendingNonce,
  completeAbraxasVerificationCore,
  INTEGRATION_CONSTANTS,
  markNonceConsumed,
} from "./nonceLifecycle.js";
import { createMemoryNonceStore } from "./memoryNonceStore.js";
import { resolveTrustedSessionBinding } from "./sessionBinding.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const MEMBER_ID = "wix-member-abc123";
const TRUSTED_CONTEXT = { memberId: MEMBER_ID };

const VALID_SANDBOX_RECEIPT = {
  signature_valid: true,
  decision_result: "approved",
  status: "active",
  partner_id: PARTNER_ID,
  policy_id: POLICY_ID,
  schema_version: "1.0.0",
  artifact_type: "eligibility_decision_receipt",
  expires_at: "2099-01-01T00:00:00.000Z",
  evaluated_claim_refs: [{ status: "active", claim_type: "product_eligibility" }],
  production_usable: false,
  decision_context: "sandbox_only",
  invalidation_reasons: ["production_not_usable:false"],
};

async function seedNonce(store, rawNonce, sessionBinding = `member:${MEMBER_ID}`) {
  const payload = await buildVerificationStartPayload({
    sessionBinding,
    hashFn,
  });
  const record = await store.insert({
    ...payload.nonceRecord,
    nonceHash: await hashFn(rawNonce),
  });
  return { record, rawNonce };
}

describe("sessionBinding", () => {
  it("derives binding from trusted Wix member backend context only", () => {
    expect(resolveTrustedSessionBinding({ memberId: MEMBER_ID })).toEqual({
      ok: true,
      sessionBinding: `member:${MEMBER_ID}`,
    });
    expect(resolveTrustedSessionBinding({ memberId: "" }).ok).toBe(false);
    expect(resolveTrustedSessionBinding({ memberId: null }).code).toBe("anonymous_session_unsupported");
  });
});

describe("integration constants", () => {
  it("uses strict sandbox mode and exact partner/policy ids", () => {
    expect(INTEGRATION_CONSTANTS).toEqual({
      mode: "sandbox",
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      returnUrlBase: RETURN_URL_BASE,
      gtvParam: GTV_PARAM,
    });
    expect(RECEIPT_VALIDATION_MODE).toBe("sandbox");
  });
});

describe("buildVerificationStartPayload", () => {
  it("builds query-free allowlist origin with gtv added only at runtime", async () => {
    const payload = await buildVerificationStartPayload({
      sessionBinding: `member:${MEMBER_ID}`,
      hashFn,
    });

    expect(payload.verifyUrl.startsWith(`${ABRAXAS_ORIGIN}/partner/verify?`)).toBe(true);
    const url = new URL(payload.verifyUrl);
    expect(url.searchParams.get("partner_id")).toBe(PARTNER_ID);
    expect(url.searchParams.get("policy_id")).toBe(POLICY_ID);

    const returnUrl = url.searchParams.get("return_url");
    expect(returnUrl).toBeTruthy();
    expect(returnUrl.startsWith(`${RETURN_URL_BASE}?${GTV_PARAM}=`)).toBe(true);
    expect(returnUrl).not.toContain("api_key");
    expect(returnUrl).not.toContain("abx_");
  });

  it("stores only hashed nonce and session binding metadata", async () => {
    const payload = await buildVerificationStartPayload({
      sessionBinding: `member:${MEMBER_ID}`,
      hashFn,
    });
    expect(payload.nonceRecord).toMatchObject({
      sessionBinding: `member:${MEMBER_ID}`,
      state: NONCE_STATE.PENDING,
      validationAttempts: 0,
    });
    expect(payload.nonceRecord).not.toHaveProperty("rawNonce");
    expect(payload.nonceRecord.nonceHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("completeAbraxasVerificationCore", () => {
  it("verifies with trusted session binding and consumes nonce before success", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-success";
    await seedNonce(store, rawNonce);

    const result = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result).toEqual({ verified: true, code: "verified" });
    const stored = await store.findByHash(await hashFn(rawNonce));
    expect(stored?.state).toBe(NONCE_STATE.CONSUMED);
  });

  it("rejects replay after consumption", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-replay";
    await seedNonce(store, rawNonce);

    const base = {
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    };

    expect((await completeAbraxasVerificationCore(base)).verified).toBe(true);
    const replay = await completeAbraxasVerificationCore(base);
    expect(replay).toEqual({ verified: false, code: "nonce_already_consumed" });
  });

  it("rejects session mismatch", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-mismatch";
    await seedNonce(store, rawNonce, "member:other-member");

    const result = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result).toEqual({ verified: false, code: "session_mismatch" });
  });

  it("rejects expired nonce", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-expired";
    const past = new Date("2020-01-01T00:00:00.000Z");
    const payload = await buildVerificationStartPayload({
      sessionBinding: `member:${MEMBER_ID}`,
      hashFn,
      now: past,
    });
    await store.insert({
      ...payload.nonceRecord,
      nonceHash: await hashFn(rawNonce),
      expiresAt: new Date(past.getTime() + 1000),
    });

    const result = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      now: new Date("2020-01-01T00:05:00.000Z"),
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result).toEqual({ verified: false, code: "nonce_expired" });
  });

  it("rejects concurrent callback — at most one succeeds", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-concurrent";
    await seedNonce(store, rawNonce);

    const base = {
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => new Promise((resolve) => {
        setTimeout(() => resolve({ verified: true }), 5);
      }),
    };

    const [first, second] = await Promise.all([
      completeAbraxasVerificationCore(base),
      completeAbraxasVerificationCore(base),
    ]);

    const successes = [first, second].filter((r) => r.verified);
    expect(successes).toHaveLength(1);
    const failures = [first, second].filter((r) => !r.verified);
    expect(failures.length).toBe(1);
    expect(["concurrent_callback_rejected", "nonce_already_consumed", "nonce_claim_in_progress"]).toContain(failures[0].code);
  });

  it("releases claim on transient receipt-fetch failure for bounded retry", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-transient";
    await seedNonce(store, rawNonce);

    const transient = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => ({ verified: false, transientFailure: true }),
    });
    expect(transient).toEqual({ verified: false, code: "receipt_fetch_transient_failure" });

    const stored = await store.findByHash(await hashFn(rawNonce));
    expect(stored?.state).toBe(NONCE_STATE.PENDING);

    const success = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });
    expect(success.verified).toBe(true);
  });

  it("permanently consumes nonce on invalid sandbox receipt", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "raw-nonce-invalid-receipt";
    await seedNonce(store, rawNonce);

    const result = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: TRUSTED_CONTEXT,
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce,
      hashFn,
      validateReceipt: async () => ({ verified: false, transientFailure: false }),
    });

    expect(result).toEqual({ verified: false, code: "receipt_invalid" });
    const stored = await store.findByHash(await hashFn(rawNonce));
    expect(stored?.state).toBe(NONCE_STATE.CONSUMED);
  });

  it("rejects anonymous sessions without inventing visitor identity", async () => {
    const store = createMemoryNonceStore();
    const result = await completeAbraxasVerificationCore({
      store,
      trustedBackendContext: { memberId: null },
      receiptId: "dr_sandbox_valid_12345678",
      rawNonce: "any",
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });
    expect(result).toEqual({ verified: false, code: "anonymous_session_unsupported" });
  });
});

describe("abraxasReceiptValidator sandbox strict mode", () => {
  it("accepts valid sandbox receipt fixture", () => {
    expect(validateSandboxReceipt(VALID_SANDBOX_RECEIPT, { now: new Date("2026-01-01") })).toEqual({
      verified: true,
    });
  });

  it("rejects production-usable sandbox receipt", () => {
    const invalid = { ...VALID_SANDBOX_RECEIPT, production_usable: true };
    expect(validateSandboxReceipt(invalid, { now: new Date("2026-01-01") }).verified).toBe(false);
  });

  it("does not require or accept API keys in validation inputs", () => {
    const withKey = { ...VALID_SANDBOX_RECEIPT, api_key: "abx_test_secret" };
    const result = validateSandboxReceipt(withKey, { now: new Date("2026-01-01") });
    expect(result.verified).toBe(true);
    expect(withKey.api_key).toBe("abx_test_secret");
  });
});

describe("traditional self-attestation path", () => {
  it("remains independent — no Abraxas nonce or receipt required", () => {
    const traditionalPath = {
      buttonLabel: "Yes, I'm 21 or older",
      requiresAbraxas: false,
      usesLocalStorageAuthority: false,
    };
    expect(traditionalPath.requiresAbraxas).toBe(false);
    expect(traditionalPath.buttonLabel).toBe("Yes, I'm 21 or older");
  });
});

describe("claimPendingNonce direct transitions", () => {
  it("transitions pending to validating with claim expiry", async () => {
    const store = createMemoryNonceStore();
    const rawNonce = "claim-test";
    const { record } = await seedNonce(store, rawNonce);
    expect(record.state).toBe(NONCE_STATE.PENDING);

    const claim = await claimPendingNonce(store, {
      sessionBinding: `member:${MEMBER_ID}`,
      rawNonce,
      hashFn,
    });
    expect(claim.ok).toBe(true);
    expect(claim.record.state).toBe(NONCE_STATE.VALIDATING);
    expect(claim.record.claimExpiresAt).toBeInstanceOf(Date);

    const consumed = await markNonceConsumed(store, claim.record);
    expect(consumed.ok).toBe(true);
    expect(consumed.record.state).toBe(NONCE_STATE.CONSUMED);
  });
});
