import { describe, expect, it } from "vitest";
import { circleCreateTransferRequest } from "@/lib/settlement/circle/contract";
import {
  allocateDistinctCircleIdempotencyKeys,
  createCircleIdempotencyKey,
  isCircleUuidV4,
} from "@/lib/settlement/circle/idempotency";

describe("Circle server-side idempotency", () => {
  it("never uses a partner or UI default as the Circle key", () => {
    const browserInput = {
      receipt_id: "00000000-0000-4000-8000-000000000099",
      idempotency_key: "demo-arc-settlement-1",
    };
    const generated = createCircleIdempotencyKey();
    expect(isCircleUuidV4(generated)).toBe(true);
    expect(generated).not.toBe(browserInput.idempotency_key);
    expect(isCircleUuidV4(browserInput.idempotency_key)).toBe(false);
  });

  it("gives two applications distinct Circle keys for identical browser input", () => {
    const browserInput = {
      receipt_id: "shared-receipt",
      idempotency_key: "demo-arc-settlement-1",
    };
    const [appA, appB] = allocateDistinctCircleIdempotencyKeys(2);
    expect(appA).not.toBe(appB);
    expect(appA).not.toBe(browserInput.idempotency_key);
    expect(appB).not.toBe(browserInput.idempotency_key);

    const transferA = circleCreateTransferRequest({
      idempotencyKey: appA,
      entitySecretCiphertext: "dGVzdA==",
      walletId: "11111111-1111-4111-8111-111111111111",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      amountUsdc: "0.01",
    });
    const transferB = circleCreateTransferRequest({
      idempotencyKey: appB,
      entitySecretCiphertext: "dGVzdA==",
      walletId: "22222222-2222-4222-8222-222222222222",
      destinationAddress: "0x0000000000000000000000000000000000000002",
      amountUsdc: "0.01",
    });
    expect(transferA.body.idempotencyKey).not.toBe(transferB.body.idempotencyKey);
    expect(new Set([transferA.body.idempotencyKey, transferB.body.idempotencyKey]).size).toBe(2);
  });

  it("allocates globally unique UUID v4 keys for the shared Circle API key", () => {
    const keys = allocateDistinctCircleIdempotencyKeys(64);
    expect(new Set(keys).size).toBe(64);
    for (const key of keys) expect(isCircleUuidV4(key)).toBe(true);
  });
});
