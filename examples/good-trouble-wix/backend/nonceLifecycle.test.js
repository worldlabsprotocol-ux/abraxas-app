// FILE: examples/good-trouble-wix/backend/nonceLifecycle.test.js

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  FLOW_ID_RE,
  VERIFIER_BYTES,
  VERIFIER_RE,
} from "./constants.js";

const { mockRandomBytes } = vi.hoisted(() => ({
  mockRandomBytes: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    randomBytes: (size) => {
      const mocked = mockRandomBytes(size);
      return mocked ?? actual.randomBytes(size);
    },
  };
});

const { buildVerificationStartPayload } = await import("./nonceLifecycle.js");

const LIFECYCLE_SOURCE = readFileSync(
  new URL("./nonceLifecycle.js", import.meta.url),
  "utf8",
);

const BACKEND_RUNTIME_FILES = [
  "abraxasVerification.web.js",
  "abraxasVerificationService.js",
  "abraxasReceiptValidator.js",
  "captchaGate.js",
  "constants.js",
  "flowCapacity.js",
  "memoryNonceStore.js",
  "nonceLifecycle.js",
  "pkceProof.js",
  "sha256Adapter.js",
  "wixNonceStore.js",
];

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

describe("nonceLifecycle crypto runtime contract", () => {
  it("uses node:crypto randomBytes and does not reference browser Web Crypto", () => {
    expect(LIFECYCLE_SOURCE).toContain('import { randomBytes } from "node:crypto"');
    expect(LIFECYCLE_SOURCE).toContain("randomBytes(byteLength).toString(\"hex\")");
    expect(LIFECYCLE_SOURCE).not.toContain("getRandomValues");
    expect(LIFECYCLE_SOURCE).not.toContain("globalThis.crypto");
    expect(LIFECYCLE_SOURCE).not.toMatch(/\bcrypto\./);
    expect(LIFECYCLE_SOURCE).not.toContain("Math.random");
  });

  it("audits Good Trouble Wix backend runtime files for browser-global crypto usage", () => {
    const violations = [];
    for (const file of BACKEND_RUNTIME_FILES) {
      const source = readFileSync(
        new URL(`./${file}`, import.meta.url),
        "utf8",
      );
      if (/getRandomValues|globalThis\.crypto|Math\.random|randomUUID/.test(source)) {
        violations.push(file);
      }
      if (/\bcrypto\.(getRandomValues|randomUUID|subtle)/.test(source)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not log verifier, challenge, or receipt secrets", () => {
    expect(LIFECYCLE_SOURCE).not.toMatch(/console\.(log|info|debug|warn|error)/);
  });
});

describe("buildVerificationStartPayload entropy", () => {
  beforeEach(() => {
    mockRandomBytes.mockReset();
  });

  it("generates verifier as 64 lowercase hex characters", async () => {
    const payload = await buildVerificationStartPayload({ hashFn });
    expect(payload.verifier).toMatch(VERIFIER_RE);
    expect(payload.verifier).toHaveLength(64);
    expect(payload.verifier).toBe(payload.verifier.toLowerCase());
  });

  it("generates flow ID matching FLOW_ID_RE", async () => {
    const payload = await buildVerificationStartPayload({ hashFn });
    expect(payload.flowId).toMatch(FLOW_ID_RE);
  });

  it("generates independent verifier and flow ID values", async () => {
    const a = await buildVerificationStartPayload({ hashFn });
    const b = await buildVerificationStartPayload({ hashFn });
    expect(a.flowId).not.toBe(b.flowId);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.flowId).not.toContain(a.verifier);
  });

  it("binds PKCE challenge to SHA-256(verifier) without storing raw verifier", async () => {
    const payload = await buildVerificationStartPayload({ hashFn });
    expect(payload.flowRecord.verifierChallenge).toBe(await hashFn(payload.verifier));
    expect(payload.flowRecord).not.toHaveProperty("verifier");
    expect(payload.verifyUrl).not.toContain(payload.verifier);
  });

  it("uses VERIFIER_BYTES for 256-bit entropy", async () => {
    const payload = await buildVerificationStartPayload({ hashFn });
    expect(VERIFIER_BYTES).toBe(32);
    expect(payload.verifier).toHaveLength(VERIFIER_BYTES * 2);
    expect(payload.flowId.replace("gtf_", "")).toHaveLength(VERIFIER_BYTES * 2);
  });
});

describe("buildVerificationStartPayload with injected node:crypto randomBytes", () => {
  beforeEach(() => {
    mockRandomBytes.mockReset();
  });

  it("derives hex from injected randomBytes output for deterministic PKCE checks", async () => {
    const verifierSeed = Buffer.alloc(VERIFIER_BYTES, 0xab);
    const flowSeed = Buffer.alloc(VERIFIER_BYTES, 0xcd);
    const correlationSeed = Buffer.alloc(8, 0x01);

    mockRandomBytes
      .mockReturnValueOnce(verifierSeed)
      .mockReturnValueOnce(flowSeed)
      .mockReturnValueOnce(correlationSeed);

    const payload = await buildVerificationStartPayload({ hashFn });

    expect(mockRandomBytes).toHaveBeenNthCalledWith(1, VERIFIER_BYTES);
    expect(mockRandomBytes).toHaveBeenNthCalledWith(2, VERIFIER_BYTES);
    expect(mockRandomBytes).toHaveBeenNthCalledWith(3, 8);
    expect(payload.verifier).toBe(verifierSeed.toString("hex"));
    expect(payload.flowId).toBe(`gtf_${flowSeed.toString("hex")}`);
    expect(payload.flowRecord.correlationId).toBe(correlationSeed.toString("hex"));
    expect(payload.flowRecord.verifierChallenge).toBe(await hashFn(verifierSeed.toString("hex")));
  });
});
