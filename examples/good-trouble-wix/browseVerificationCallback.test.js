// FILE: examples/good-trouble-wix/browseVerificationCallback.test.js
// Browse callback hygiene, UI gate, and backend validation regression tests.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import {
  buildHrefWithoutSensitiveParams,
  hasSensitiveCallbackQueryParams,
  stripSensitiveCallbackParamsFromHref,
} from "./public/browseCallbackHygiene.js";
import {
  BROWSE_ACCESS_SESSION_VALUE,
  dismissBrowseAgeVerificationPopup,
  isBrowseAccessGranted,
  setBrowseAccessSessionFlag,
  shouldSuppressBrowseAgeGate,
} from "./public/browseAccessUi.js";
import {
  extractBrowseCallbackInputs,
  isBackendBrowseVerificationSuccess,
  parseAllowlistedBrowseCallbackParams,
  resolveSafeReturnDestination,
  shouldRetainVerifierForRetry,
} from "./public/browseVerificationCallbackLogic.js";
import { BROWSE_ACCESS_STORAGE_KEY, GTB_PARAM } from "./public/abraxasClientConstants.js";
import { validateBrowseAccessPayload } from "./backend/browseReceiptValidator.js";
import { authorizePurchaseEligibility } from "./backend/purchaseEligibilityAuthorization.js";
import {
  completeBrowseVerificationService,
  __testOnlySetHashFn,
} from "./backend/abraxasVerificationService.js";
import { buildVerificationStartPayload } from "./backend/nonceLifecycle.js";
import { createMemoryNonceStore } from "./backend/memoryNonceStore.js";
import { BROWSE_POLICY_ID, PARTNER_ID } from "./backend/constants.js";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const VALID_BROWSE_PAYLOAD = {
  artifact_type: "browse_access_receipt",
  valid_for_purchase: false,
  purpose: "browse",
  assurance_level: "L0",
  age_band: "over_21",
  partner_id: PARTNER_ID,
  policy_id: BROWSE_POLICY_ID,
  expires_at: "2099-01-01T00:00:00.000Z",
};

function createSessionStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
  };
}

beforeEach(() => {
  __testOnlySetHashFn(hashFn);
});

describe("browse callback URL hygiene", () => {
  it("detects sensitive browse callback params on the homepage URL", () => {
    const href =
      "https://www.goodtroublecanna.com/?browse_receipt=eyJhbGciOiJFZERTQSJ9.test&browse_receipt_id=br_1&purpose=browse&policy_id=good-trouble-browse-v1";
    expect(hasSensitiveCallbackQueryParams(href)).toBe(true);
  });

  it("removes browse receipt and callback params from the address bar", () => {
    const href =
      "https://www.goodtroublecanna.com/?browse_receipt=secret&browse_receipt_id=br_1&purpose=browse&policy_id=good-trouble-browse-v1&gtb=gtb_flow";
    const replaced = [];
    const cleaned = stripSensitiveCallbackParamsFromHref(
      href,
      (_state, _title, url) => { replaced.push(url); },
    );
    expect(cleaned).toBe("/");
    expect(replaced).toEqual(["/"]);
    expect(buildHrefWithoutSensitiveParams(href).href).toBe("https://www.goodtroublecanna.com/");
  });

  it("returns to a clean same-origin path without callback parameters", () => {
    expect(resolveSafeReturnDestination("/shop")).toBe("/shop");
    expect(resolveSafeReturnDestination("//evil.example")).toBe("/");
    expect(resolveSafeReturnDestination("https://evil.example")).toBe("/");
  });
});

describe("browse age popup suppression", () => {
  it("does not suppress the age popup without backend-verified session flag", () => {
    const sessionStorage = createSessionStorage();
    expect(shouldSuppressBrowseAgeGate(sessionStorage)).toBe(false);
    expect(isBrowseAccessGranted(sessionStorage)).toBe(false);
  });

  it("suppresses the age popup only after backend success sets the session flag", () => {
    const sessionStorage = createSessionStorage();
    setBrowseAccessSessionFlag(sessionStorage);
    expect(sessionStorage.getItem(BROWSE_ACCESS_STORAGE_KEY)).toBe(BROWSE_ACCESS_SESSION_VALUE);
    expect(shouldSuppressBrowseAgeGate(sessionStorage)).toBe(true);
  });

  it("URL-only receipt params cannot unlock browsing without backend validation", () => {
    const sessionStorage = createSessionStorage();
    const params = parseAllowlistedBrowseCallbackParams({
      browse_receipt: "eyJhbGciOiJFZERTQSJ9.fake",
      purpose: "browse",
      policy_id: BROWSE_POLICY_ID,
      age_band: "over_21",
      assurance: "L0",
      success: "true",
      [GTB_PARAM]: "gtb_test",
    });
    expect(params.browse_receipt).toBeTruthy();
    expect(params.purpose).toBe("browse");
    expect(shouldSuppressBrowseAgeGate(sessionStorage)).toBe(false);
    expect(isBackendBrowseVerificationSuccess({ verified: true, purpose: "browse" })).toBe(true);
    expect(isBackendBrowseVerificationSuccess({ verified: true, purpose: "purchase" })).toBe(false);
  });

  it("dismisses the age verification lightbox when browse access is granted", async () => {
    let closed = false;
    await dismissBrowseAgeVerificationPopup({
      lightbox: { close: async () => { closed = true; } },
    });
    expect(closed).toBe(true);
  });
});

describe("browse callback input parsing", () => {
  it("parses only allowlisted callback parameters", () => {
    const parsed = parseAllowlistedBrowseCallbackParams({
      browse_receipt: "jwt",
      browse_receipt_id: "br_ignored",
      partner_id: PARTNER_ID,
      policy_id: BROWSE_POLICY_ID,
      purpose: "browse",
      [GTB_PARAM]: "gtb_flow123",
      age_band: "over_21",
      assurance: "L0",
      success: "true",
    });
    expect(parsed).toEqual({
      browse_receipt: "jwt",
      partner_id: PARTNER_ID,
      policy_id: BROWSE_POLICY_ID,
      purpose: "browse",
      [GTB_PARAM]: "gtb_flow123",
    });
    expect(parsed.browse_receipt_id).toBeUndefined();
    expect(parsed.age_band).toBeUndefined();
  });

  it("extracts flow-bound receipt inputs for backend verification", () => {
    const inputs = extractBrowseCallbackInputs({
      browse_receipt: " jwt ",
      [GTB_PARAM]: " gtb_flow ",
    });
    expect(inputs).toEqual({ flowId: "gtb_flow", browseReceipt: "jwt" });
  });

  it("retains verifier only for retryable transient backend failures", () => {
    expect(shouldRetainVerifierForRetry({ retryable: true, verified: false })).toBe(true);
    expect(shouldRetainVerifierForRetry({ verified: true, purpose: "browse" })).toBe(false);
    expect(shouldRetainVerifierForRetry({ verified: false, code: "browse_receipt_invalid" })).toBe(false);
  });
});

describe("browse receipt backend validation", () => {
  it("requires browse artifact contract including age_band over_21", () => {
    expect(validateBrowseAccessPayload(VALID_BROWSE_PAYLOAD).verified).toBe(true);
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, age_band: "under_21" }).verified).toBe(false);
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, purpose: "purchase" }).verified).toBe(false);
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, policy_id: "other-policy" }).verified).toBe(false);
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, partner_id: "other-partner" }).verified).toBe(false);
  });

  it("rejects expired browse receipts", () => {
    const expired = { ...VALID_BROWSE_PAYLOAD, expires_at: "2000-01-01T00:00:00.000Z" };
    expect(validateBrowseAccessPayload(expired, { now: new Date("2026-01-01T00:00:00.000Z") }).verified).toBe(false);
  });

  it("rejects verifier mismatch for browse completion", async () => {
    const store = createMemoryNonceStore();
    const browse = await buildVerificationStartPayload({ hashFn, purpose: "browse" });
    await store.insert(browse.flowRecord);

    const result = await completeBrowseVerificationService(
      "eyJhbGciOiJFZERTQSJ9.test",
      browse.flowId,
      "b".repeat(64),
      {
        store,
        validateBrowseReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );

    expect(result.verified).toBe(false);
    expect(result.code).toBe("verifier_mismatch");
  });

  it("rejects replay after browse flow is consumed", async () => {
    const store = createMemoryNonceStore();
    const browse = await buildVerificationStartPayload({ hashFn, purpose: "browse" });
    const inserted = await store.insert({ ...browse.flowRecord, state: "consumed", consumedAt: new Date() });

    const result = await completeBrowseVerificationService(
      "eyJhbGciOiJFZERTQSJ9.test",
      inserted.flowId,
      browse.verifier,
      {
        store,
        validateBrowseReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );

    expect(result.verified).toBe(false);
    expect(result.code).toBe("flow_already_consumed");
  });

  it("rejects partner/policy mismatch in browse payload validation", () => {
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, policy_id: "wrong-policy" }).verified).toBe(false);
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, partner_id: "wrong-partner" }).verified).toBe(false);
    expect(validateBrowseAccessPayload({ ...VALID_BROWSE_PAYLOAD, purpose: "purchase" }).verified).toBe(false);
  });
});

describe("browse purchase boundary and member safety", () => {
  it("browse session flag cannot authorize checkout", () => {
    expect(authorizePurchaseEligibility({
      sessionStorageBrowseFlag: BROWSE_ACCESS_SESSION_VALUE,
      receipt: {
        artifact_type: "eligibility_decision_receipt",
        valid_for_purchase: true,
        purpose: "purchase",
        assurance_level: "L2",
        partner_id: PARTNER_ID,
        policy_id: "good-trouble-retail-v1",
        expires_at: "2099-01-01T00:00:00.000Z",
        signature_valid: true,
        decision_result: "approved",
        status: "active",
        schema_version: "1.0.0",
        evaluated_claim_refs: [{ status: "active", claim_type: "product_eligibility" }],
        production_usable: false,
        decision_context: "sandbox_only",
        invalidation_reasons: ["production_not_usable:false"],
      },
      flowConsumed: true,
    }).authorized).toBe(false);
  });

  it("does not create a Wix member from L0 browse callback code", () => {
    const sources = [
      "pages/BrowseVerificationResult.js",
      "pages/Homepage.js",
      "pages/masterPage.js",
      "pages/AgeVerificationPopup.js",
      "public/browseAccessUi.js",
      "public/browseVerificationCallbackLogic.js",
    ].map((path) => readFileSync(join(ROOT, path), "utf8")).join("\n");

    expect(sources).not.toMatch(/wix-users|wix-members|authentication\.register|members\.register/i);
  });

  it("does not log receipts or DOB in browse callback page code", () => {
    const callbackSource = readFileSync(join(ROOT, "pages/BrowseVerificationResult.js"), "utf8");
    const logicSource = readFileSync(join(ROOT, "public/browseVerificationCallbackLogic.js"), "utf8");

    for (const source of [callbackSource, logicSource]) {
      expect(source).not.toMatch(/console\.(log|info|debug|warn|error)/);
      expect(source).not.toContain("date_of_birth");
    }

    expect(callbackSource).not.toMatch(/console\.(log|info|debug|warn|error)\([^)]*browseReceipt/);
  });
});
