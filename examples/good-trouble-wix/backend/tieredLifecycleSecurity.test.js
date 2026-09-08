// FILE: examples/good-trouble-wix/backend/tieredLifecycleSecurity.test.js
// Browse (L0) vs purchase (L2+) lifecycle security — fail-closed on all downgrade paths.

import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import {
  BROWSE_POLICY_ID,
  BROWSE_RETURN_URL_BASE,
  FLOW_PURPOSE_BROWSE,
  FLOW_PURPOSE_PURCHASE,
  GTB_PARAM,
  GTV_PARAM,
  PARTNER_ID,
  POLICY_ID,
  PURCHASE_RETURN_URL_BASE,
} from "./constants.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
  completeBrowseVerificationCore,
} from "./nonceLifecycle.js";
import { createMemoryNonceStore } from "./memoryNonceStore.js";
import {
  completeBrowseVerificationService,
  completePurchaseVerificationService,
  createBrowseVerificationStartService,
  createPurchaseVerificationStartService,
  __testOnlySetHashFn,
} from "./abraxasVerificationService.js";
import { authorizePurchaseEligibility } from "./purchaseEligibilityAuthorization.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const VALID_PURCHASE_RECEIPT = {
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
  assurance_level: "L2",
  purpose: "purchase",
};

const VALID_BROWSE_RECEIPT = {
  artifact_type: "browse_access_receipt",
  valid_for_purchase: false,
  purpose: "browse",
  assurance_level: "L0",
  partner_id: PARTNER_ID,
  policy_id: BROWSE_POLICY_ID,
  expires_at: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  __testOnlySetHashFn(hashFn);
});

describe("separate start lifecycles", () => {
  it("browse start uses browse policy, callback param, and purpose=browse", async () => {
    const payload = await buildVerificationStartPayload({ hashFn, purpose: "browse" });
    expect(payload.purpose).toBe(FLOW_PURPOSE_BROWSE);
    expect(payload.policyId).toBe(BROWSE_POLICY_ID);
    expect(payload.flowId.startsWith("gtb_")).toBe(true);
    expect(payload.verifyUrl).toContain("good-trouble-browse-v1");
    expect(payload.verifyUrl).toContain("purpose=browse");
    expect(payload.flowRecord.purpose).toBe("browse");
    const partnerUrl = new URL(payload.verifyUrl);
    const returnUrl = decodeURIComponent(partnerUrl.searchParams.get("return_url") ?? "");
    expect(returnUrl).toContain(BROWSE_RETURN_URL_BASE);
    expect(returnUrl).toContain(`${GTB_PARAM}=`);
  });

  it("purchase start uses retail policy and purchase callback", async () => {
    const payload = await buildVerificationStartPayload({ hashFn, purpose: "purchase" });
    expect(payload.purpose).toBe(FLOW_PURPOSE_PURCHASE);
    expect(payload.policyId).toBe(POLICY_ID);
    expect(payload.flowId.startsWith("gtf_")).toBe(true);
    expect(payload.verifyUrl).toContain("good-trouble-retail-v1");
    expect(payload.flowRecord.purpose).toBe("purchase");
    const returnMatch = payload.verifyUrl.match(/return_url=([^&]+)/);
    const returnUrl = decodeURIComponent(returnMatch?.[1] ?? "");
    expect(returnUrl).toContain(PURCHASE_RETURN_URL_BASE);
    expect(returnUrl).toContain(`${GTV_PARAM}=`);
  });
});

describe("purpose confusion fails closed", () => {
  it("purchase completion rejects browse-purpose flow record", async () => {
    const store = createMemoryNonceStore();
    const browse = await buildVerificationStartPayload({ hashFn, purpose: "browse" });
    await store.insert(browse.flowRecord);

    const result = await completePurchaseVerificationService(
      "dr_sandbox_valid_12345678",
      browse.flowId,
      browse.verifier,
      {
        store,
        validateReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );

    expect(result.verified).toBe(false);
    expect(result.code).toBe("flow_purpose_mismatch");
  });

  it("browse completion rejects purchase-purpose flow record", async () => {
    const store = createMemoryNonceStore();
    const purchase = await buildVerificationStartPayload({ hashFn, purpose: "purchase" });
    await store.insert(purchase.flowRecord);

    const result = await completeBrowseVerificationService(
      "eyJhbGciOiJFZERTQSJ9.test",
      purchase.flowId,
      purchase.verifier,
      {
        store,
        validateBrowseReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );

    expect(result.verified).toBe(false);
    expect(result.code).toBe("flow_purpose_mismatch");
  });

  it("browse receipt cannot authorize purchase eligibility", () => {
    expect(authorizePurchaseEligibility({
      receipt: VALID_BROWSE_RECEIPT,
      flowPurpose: FLOW_PURPOSE_PURCHASE,
      flowConsumed: true,
    }).authorized).toBe(false);
  });
});

describe("replay and verifier binding", () => {
  it("consumed purchase flow cannot complete again", async () => {
    const store = createMemoryNonceStore();
    const purchase = await buildVerificationStartPayload({ hashFn, purpose: "purchase" });
    const inserted = await store.insert({ ...purchase.flowRecord, state: "consumed", consumedAt: new Date() });

    const result = await completeAbraxasVerificationCore({
      store,
      receiptId: "dr_sandbox_valid_12345678",
      flowId: inserted.flowId,
      verifier: purchase.verifier,
      hashFn,
      validateReceipt: async () => ({ verified: true, transientFailure: false }),
    });

    expect(result.verified).toBe(false);
    expect(result.code).toBe("flow_already_consumed");
  });

  it("verifier mismatch fails closed", async () => {
    const store = createMemoryNonceStore();
    const purchase = await buildVerificationStartPayload({ hashFn, purpose: "purchase" });
    await store.insert(purchase.flowRecord);

    const result = await completePurchaseVerificationService(
      "dr_sandbox_valid_12345678",
      purchase.flowId,
      "a".repeat(64),
      {
        store,
        validateReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );

    expect(result.verified).toBe(false);
    expect(result.code).toBe("verifier_mismatch");
  });
});

describe("URL tampering and client flags", () => {
  it("rejects url status=approved for checkout", () => {
    expect(authorizePurchaseEligibility({ urlStatus: "approved", receipt: VALID_PURCHASE_RECEIPT, flowConsumed: true }).authorized).toBe(false);
  });

  it("rejects browse session flag at checkout", () => {
    expect(authorizePurchaseEligibility({
      sessionStorageBrowseFlag: "1",
      receipt: VALID_PURCHASE_RECEIPT,
      flowConsumed: true,
    }).authorized).toBe(false);
  });

  it("rejects purchase session flag alone at checkout", () => {
    expect(authorizePurchaseEligibility({
      sessionStoragePurchaseFlag: "1",
      receipt: VALID_PURCHASE_RECEIPT,
      flowConsumed: true,
    }).authorized).toBe(false);
  });

  it("rejects url policy browse at checkout", () => {
    expect(authorizePurchaseEligibility({
      urlPolicyId: BROWSE_POLICY_ID,
      receipt: VALID_PURCHASE_RECEIPT,
      flowConsumed: true,
    }).authorized).toBe(false);
  });

  it("rejects url purpose browse at checkout", () => {
    expect(authorizePurchaseEligibility({
      urlPurpose: "browse",
      receipt: VALID_PURCHASE_RECEIPT,
      flowConsumed: true,
    }).authorized).toBe(false);
  });
});

describe("purchase eligibility requires consumed L2+ receipt", () => {
  it("rejects when flow not consumed", () => {
    expect(authorizePurchaseEligibility({
      receipt: VALID_PURCHASE_RECEIPT,
      flowConsumed: false,
    }).authorized).toBe(false);
  });

  it("authorizes fresh consumed partner-bound purchase receipt", () => {
    expect(validateSandboxReceipt(VALID_PURCHASE_RECEIPT).verified).toBe(true);
    expect(authorizePurchaseEligibility({
      receipt: VALID_PURCHASE_RECEIPT,
      flowPurpose: FLOW_PURPOSE_PURCHASE,
      flowPolicyId: POLICY_ID,
      flowConsumed: true,
    }).authorized).toBe(true);
  });

  it("rejects expired purchase receipt", () => {
    const expired = { ...VALID_PURCHASE_RECEIPT, expires_at: "2000-01-01T00:00:00.000Z" };
    expect(authorizePurchaseEligibility({
      receipt: expired,
      flowConsumed: true,
    }).authorized).toBe(false);
  });

  it("rejects L0 assurance on purchase receipt", () => {
    const l0 = { ...VALID_PURCHASE_RECEIPT, assurance_level: "L0" };
    expect(authorizePurchaseEligibility({
      receipt: l0,
      flowConsumed: true,
    }).authorized).toBe(false);
  });
});

describe("service start separation", () => {
  it("createBrowseVerificationStartService returns browse purpose", async () => {
    const store = createMemoryNonceStore();
    const result = await createBrowseVerificationStartService(null, { store, skipCaptcha: true });
    expect(result.purpose).toBe("browse");
    expect(result.policyId).toBe(BROWSE_POLICY_ID);
  });

  it("createPurchaseVerificationStartService returns purchase purpose", async () => {
    const store = createMemoryNonceStore();
    const result = await createPurchaseVerificationStartService(null, { store, skipCaptcha: true });
    expect(result.purpose).toBe("purchase");
    expect(result.policyId).toBe(POLICY_ID);
  });
});
