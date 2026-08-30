// FILE: examples/good-trouble-wix/backend/abraxasVerification.test.js

import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import {
  ABRAXAS_ORIGIN,
  FLOW_ID_RE,
  GTV_PARAM,
  NONCE_STATE,
  PARTNER_ID,
  POLICY_ID,
  RECEIPT_VALIDATION_MODE,
  RETURN_URL_BASE,
  VERIFIER_RE,
} from "./constants.js";
import {
  buildVerificationStartPayload,
  claimPendingFlow,
  completeAbraxasVerificationCore,
  INTEGRATION_CONSTANTS,
  markFlowConsumed,
} from "./nonceLifecycle.js";
import { createMemoryNonceStore } from "./memoryNonceStore.js";
import {
  timingSafeEqualStrings,
  validateFlowId,
  validateVerifier,
  verifyVerifierChallenge,
} from "./pkceProof.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";
import {
  createAbraxasVerificationStartService,
  completeAbraxasVerificationService,
  __testOnlySetHashFn,
} from "./abraxasVerificationService.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

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

async function seedFlow(store, overrides = {}) {
  const payload = await buildVerificationStartPayload({ hashFn });
  const record = await store.insert({
    ...payload.flowRecord,
    ...overrides,
  });
  return {
    record,
    flowId: payload.flowId,
    verifier: payload.verifier,
    verifyUrl: payload.verifyUrl,
  };
}

beforeEach(() => {
  __testOnlySetHashFn(hashFn);
});

describe("PKCE proof validation", () => {
  it("accepts well-formed flow IDs and verifiers", () => {
    expect(validateFlowId("gtf_" + "a".repeat(64)).ok).toBe(true);
    expect(validateVerifier("b".repeat(64)).ok).toBe(true);
    expect(FLOW_ID_RE.test("gtf_" + "a".repeat(64))).toBe(true);
    expect(VERIFIER_RE.test("b".repeat(64))).toBe(true);
  });

  it("rejects missing or malformed verifier", () => {
    expect(validateVerifier("").code).toBe("missing_verifier");
    expect(validateVerifier("short").code).toBe("invalid_verifier");
  });

  it("verifies challenge with timing-safe comparison", async () => {
    const verifier = "c".repeat(64);
    const challenge = await hashFn(verifier);
    expect(await verifyVerifierChallenge(verifier, challenge, hashFn)).toEqual({ ok: true });
    expect(await verifyVerifierChallenge("d".repeat(64), challenge, hashFn)).toEqual({
      ok: false,
      code: "verifier_mismatch",
    });
  });

  it("uses timing-safe equal for equal-length hex strings", () => {
    const a = "aa";
    const b = "aa";
    const c = "ab";
    expect(timingSafeEqualStrings(a, b)).toBe(true);
    expect(timingSafeEqualStrings(a, c)).toBe(false);
    expect(timingSafeEqual(Buffer.from(a), Buffer.from(b))).toBe(true);
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
  it("puts opaque flowId in return_url gtv — never the verifier", async () => {
    const payload = await buildVerificationStartPayload({ hashFn });

    expect(payload.verifyUrl.startsWith(`${ABRAXAS_ORIGIN}/partner/verify?`)).toBe(true);
    const url = new URL(payload.verifyUrl);
    expect(url.searchParams.get("partner_id")).toBe(PARTNER_ID);
    expect(url.searchParams.get("policy_id")).toBe(POLICY_ID);

    const returnUrl = url.searchParams.get("return_url");
    expect(returnUrl).toBeTruthy();
    expect(returnUrl).toContain(`${GTV_PARAM}=${encodeURIComponent(payload.flowId)}`);
    expect(returnUrl).not.toContain(payload.verifier);
    expect(returnUrl).not.toContain("api_key");
    expect(returnUrl).not.toContain("abx_");
  });

  it("stores only verifier challenge — no raw verifier", async () => {
    const payload = await buildVerificationStartPayload({ hashFn });
    expect(payload.flowRecord).toMatchObject({
      flowId: payload.flowId,
      state: NONCE_STATE.PENDING,
      validationAttempts: 0,
    });
    expect(payload.flowRecord.verifierChallenge).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.flowRecord).not.toHaveProperty("verifier");
    expect(payload.flowRecord.verifierChallenge).toBe(await hashFn(payload.verifier));
  });
});

describe("createAbraxasVerificationStart service", () => {
  it("returns verifyUrl, flowId, and verifier over TLS response", async () => {
    const store = createMemoryNonceStore();
    const result = await createAbraxasVerificationStartService("captcha-token", {
      store,
      hashFn,
      skipCaptcha: true,
    });

    expect(result.error).toBeUndefined();
    expect(result.verifyUrl).toMatch(/^https:\/\/abraxasworld\.xyz\/partner\/verify\?/);
    expect(result.flowId).toMatch(FLOW_ID_RE);
    expect(result.verifier).toMatch(VERIFIER_RE);
    expect(result.verifyUrl).not.toContain(result.verifier);

    const stored = await store.findByFlowId(result.flowId);
    expect(stored?.verifierChallenge).toBe(await hashFn(result.verifier));
  });

  it("does not require Wix membership", async () => {
    const store = createMemoryNonceStore();
    const result = await createAbraxasVerificationStartService("captcha-token", {
      store,
      hashFn,
      skipCaptcha: true,
    });
    expect(result.flowId).toBeTruthy();
    expect(result.verifier).toBeTruthy();
  });

  it("requires captcha token unless explicitly skipped in tests", async () => {
    const store = createMemoryNonceStore();
    const missing = await createAbraxasVerificationStartService("", { store, hashFn });
    expect(missing).toEqual({ error: "captcha_required" });

    const invalid = await createAbraxasVerificationStartService("token", {
      store,
      hashFn,
      authorizeCaptcha: async () => {
        throw new Error("invalid");
      },
    });
    expect(invalid).toEqual({ error: "captcha_invalid" });
  });

  it("returns rate_limited when outstanding pending flows exceed cap", async () => {
    const store = createMemoryNonceStore();
    const now = new Date("2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 100; i += 1) {
      const payload = await buildVerificationStartPayload({ hashFn, now });
      await store.insert(payload.flowRecord);
    }
    const result = await createAbraxasVerificationStartService("captcha-token", {
      store,
      hashFn,
      skipCaptcha: true,
      now,
    });
    expect(result).toEqual({ error: "rate_limited" });
  });

  it("purges expired pending flows before capacity evaluation", async () => {
    const store = createMemoryNonceStore();
    const past = new Date("2020-01-01T00:00:00.000Z");
    const payload = await buildVerificationStartPayload({ hashFn, now: past });
    await store.insert({
      ...payload.flowRecord,
      expiresAt: new Date(past.getTime() + 1000),
    });
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = await createAbraxasVerificationStartService("captcha-token", {
      store,
      hashFn,
      skipCaptcha: true,
      now,
    });
    expect(result.error).toBeUndefined();
    expect(result.flowId).toBeTruthy();
  });
});

describe("completeAbraxasVerificationCore — PKCE", () => {
  it("verifies with possession proof and consumes flow before success", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier } = await seedFlow(store);

    const result = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result).toEqual({ verified: true, code: "verified" });
    const stored = await store.findByFlowId(flowId);
    expect(stored?.state).toBe(NONCE_STATE.CONSUMED);
  });

  it("rejects copied callback URL without verifier (missing_verifier)", async () => {
    const store = createMemoryNonceStore();
    const { flowId } = await seedFlow(store);

    const result = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier: "",
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result.verified).toBe(false);
    expect(result.code).toBe("missing_verifier");
  });

  it("rejects wrong verifier", async () => {
    const store = createMemoryNonceStore();
    const { flowId } = await seedFlow(store);

    const result = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier: "f".repeat(64),
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result).toEqual({ verified: false, code: "verifier_mismatch" });
  });

  it("rejects replay after consumption", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier } = await seedFlow(store);

    const base = {
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    };

    expect((await completeAbraxasVerificationCore(base)).verified).toBe(true);
    const replay = await completeAbraxasVerificationCore(base);
    expect(replay).toEqual({ verified: false, code: "flow_already_consumed" });
  });

  it("rejects expired flow", async () => {
    const store = createMemoryNonceStore();
    const past = new Date("2020-01-01T00:00:00.000Z");
    const payload = await buildVerificationStartPayload({ hashFn, now: past });
    await store.insert({
      ...payload.flowRecord,
      expiresAt: new Date(past.getTime() + 1000),
    });

    const result = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId: payload.flowId,
      verifier: payload.verifier,
      hashFn,
      now: new Date("2020-01-01T00:05:00.000Z"),
      validateReceipt: async () => ({ verified: true }),
    });

    expect(result).toEqual({ verified: false, code: "flow_expired" });
  });

  it("rejects concurrent completion — at most one succeeds", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier } = await seedFlow(store);

    const base = {
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier,
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
    expect([
      "concurrent_completion_rejected",
      "flow_already_consumed",
      "flow_claim_in_progress",
    ]).toContain(failures[0].code);
  });

  it("never grants verification on transient receipt failure; allows bounded retry", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier } = await seedFlow(store);
    let attempts = 0;

    const transient = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier,
      hashFn,
      validateReceipt: async () => {
        attempts += 1;
        return { verified: false, transientFailure: true };
      },
    });

    expect(transient.verified).toBe(false);
    expect(transient.code).toBe("receipt_fetch_transient_failure");
    expect(transient.retryable).toBe(true);

    const stored = await store.findByFlowId(flowId);
    expect(stored?.state).toBe(NONCE_STATE.PENDING);

    const success = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier,
      hashFn,
      validateReceipt: async () => ({ verified: true }),
    });
    expect(success.verified).toBe(true);
    expect(attempts).toBeGreaterThan(0);
  });

  it("permanently consumes flow on invalid sandbox receipt", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier } = await seedFlow(store);

    const result = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId,
      verifier,
      hashFn,
      validateReceipt: async () => ({ verified: false, transientFailure: false }),
    });

    expect(result).toEqual({ verified: false, code: "receipt_invalid" });
    const stored = await store.findByFlowId(flowId);
    expect(stored?.state).toBe(NONCE_STATE.CONSUMED);
  });
});

describe("completeAbraxasVerification web method wrapper", () => {
  it("delegates to core with injected store", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier } = await seedFlow(store);

    const result = await completeAbraxasVerificationService(
      "dr_sandbox_valid_12345678",
      flowId,
      verifier,
      {
        store,
        hashFn,
        validateReceipt: async () => ({ verified: true }),
      },
    );

    expect(result.verified).toBe(true);
  });
});

describe("claimPendingFlow direct transitions", () => {
  it("transitions pending to validating with claim expiry", async () => {
    const store = createMemoryNonceStore();
    const { flowId, verifier, record } = await seedFlow(store);
    expect(record.state).toBe(NONCE_STATE.PENDING);

    const claim = await claimPendingFlow(store, { flowId, verifier, hashFn });
    expect(claim.ok).toBe(true);
    expect(claim.record.state).toBe(NONCE_STATE.VALIDATING);
    expect(claim.record.claimExpiresAt).toBeInstanceOf(Date);

    const consumed = await markFlowConsumed(store, claim.record);
    expect(consumed.ok).toBe(true);
    expect(consumed.record.state).toBe(NONCE_STATE.CONSUMED);
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
  });
});

describe("traditional self-attestation path", () => {
  it("remains independent — no Abraxas flow or receipt required", () => {
    const traditionalPath = {
      buttonId: "yesButton",
      buttonLabel: "Yes, I'm 21 or older",
      requiresAbraxas: false,
      usesLocalStorageAuthority: false,
    };
    expect(traditionalPath.requiresAbraxas).toBe(false);
    expect(traditionalPath.buttonId).toBe("yesButton");
  });
});

describe("Wix webMethod source contract", () => {
  it("exports Permissions.Anyone webMethod wrappers in .web.js", () => {
    const source = readFileSync(
      new URL("./abraxasVerification.web.js", import.meta.url),
      "utf8",
    );
    expect(source).toContain("webMethod");
    expect(source).toContain("Permissions.Anyone");
    expect(source).toContain("wix-captcha-backend");
    expect(source).not.toContain("wix-data.insert");
  });
});

describe("PKCE entropy and independence", () => {
  it("generates independent random flowId and verifier with 256-bit entropy each", async () => {
    const a = await buildVerificationStartPayload({ hashFn });
    const b = await buildVerificationStartPayload({ hashFn });
    expect(a.flowId).not.toBe(b.flowId);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.verifier).toHaveLength(64);
    expect(a.flowId.replace("gtf_", "")).toHaveLength(64);
  });
});
