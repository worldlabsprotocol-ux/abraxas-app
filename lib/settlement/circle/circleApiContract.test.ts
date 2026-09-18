import { describe, expect, it } from "vitest";
import {
  CIRCLE_CREATE_TRANSFER_RESPONSE_SHAPE,
  CIRCLE_GET_TRANSACTION_RESPONSE_SHAPE,
  circleCreateTransferRequest,
  circleGetEntityPublicKeyRequest,
  circleGetTransactionRequest,
  circleGetWalletRequest,
} from "@/lib/settlement/circle/contract";
import {
  ARC_TESTNET_USDC_TOKEN_ADDRESS,
  CIRCLE_API_BASE_URL,
  CIRCLE_ENTITY_PUBLIC_KEY_PATH,
  CIRCLE_NETWORK,
  CIRCLE_TRANSACTION_PATH,
  CIRCLE_TRANSFER_PATH,
  CIRCLE_WALLET_PATH,
} from "@/lib/settlement/circle/constants";
import { createCircleIdempotencyKey } from "@/lib/settlement/circle/idempotency";

describe("Circle official API contract", () => {
  it("retrieves a wallet with GET /v1/w3s/wallets/{id}", () => {
    const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const req = circleGetWalletRequest(id);
    expect(req.method).toBe("GET");
    expect(req.path).toBe(`/v1/w3s/wallets/${id}`);
    expect(req.path).toBe(`${CIRCLE_WALLET_PATH}/${id}`);
    expect(req.url).toBe(`${CIRCLE_API_BASE_URL}/v1/w3s/wallets/${id}`);
    expect(CIRCLE_WALLET_PATH).toBe("/v1/w3s/wallets");
    expect(CIRCLE_WALLET_PATH).not.toContain("/developer/wallets");
  });

  it("looks up a transaction with GET /v1/w3s/transactions/{id}", () => {
    const id = "c4d1da72-111e-4d52-bdbf-2e74a2d803d5";
    const req = circleGetTransactionRequest(id);
    expect(req.method).toBe("GET");
    expect(req.path).toBe(`/v1/w3s/transactions/${id}`);
    expect(req.path).toBe(`${CIRCLE_TRANSACTION_PATH}/${id}`);
    expect(CIRCLE_GET_TRANSACTION_RESPONSE_SHAPE.data.transaction.state).toBe("TransactionState");
  });

  it("loads the entity public key with GET /v1/w3s/config/entity/publicKey", () => {
    const req = circleGetEntityPublicKeyRequest();
    expect(req.method).toBe("GET");
    expect(req.path).toBe("/v1/w3s/config/entity/publicKey");
    expect(req.path).toBe(CIRCLE_ENTITY_PUBLIC_KEY_PATH);
  });

  it("creates a transfer with POST /v1/w3s/developer/transactions/transfer and official body", () => {
    const idempotencyKey = createCircleIdempotencyKey();
    const req = circleCreateTransferRequest({
      idempotencyKey,
      entitySecretCiphertext: "dGVzdA==",
      walletId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      amountUsdc: "0.01",
    });
    expect(req.method).toBe("POST");
    expect(req.path).toBe("/v1/w3s/developer/transactions/transfer");
    expect(req.path).toBe(CIRCLE_TRANSFER_PATH);
    expect(req.body).toEqual({
      idempotencyKey,
      entitySecretCiphertext: "dGVzdA==",
      walletId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      tokenAddress: ARC_TESTNET_USDC_TOKEN_ADDRESS,
      blockchain: CIRCLE_NETWORK,
      amounts: ["0.01"],
      feeLevel: "MEDIUM",
    });
    expect(req.body.tokenAddress).toBe("0x3600000000000000000000000000000000000000");
    expect(req.body.blockchain).toBe("ARC-TESTNET");
    expect(CIRCLE_CREATE_TRANSFER_RESPONSE_SHAPE.data).toEqual({ id: "uuid", state: "TransactionState" });
  });

  it("rejects a non-UUID v4 Circle idempotency key in the transfer body", () => {
    expect(() => circleCreateTransferRequest({
      idempotencyKey: "demo-arc-settlement-1",
      entitySecretCiphertext: "dGVzdA==",
      walletId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      amountUsdc: "0.01",
    })).toThrow("circle_idempotency_not_uuid_v4");
  });
});
