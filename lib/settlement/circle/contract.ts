// FILE: lib/settlement/circle/contract.ts
// Official Circle developer-controlled wallets HTTP contract. No network I/O.

import {
  ARC_TESTNET_USDC_TOKEN_ADDRESS,
  CIRCLE_API_BASE_URL,
  CIRCLE_CURRENCY,
  CIRCLE_ENTITY_PUBLIC_KEY_PATH,
  CIRCLE_NETWORK,
  CIRCLE_TRANSACTION_PATH,
  CIRCLE_TRANSFER_PATH,
  CIRCLE_WALLET_PATH,
} from "@/lib/settlement/circle/constants";
import { isCircleUuidV4 } from "@/lib/settlement/circle/idempotency";

export const CIRCLE_TRANSFER_FEE_LEVEL = "MEDIUM" as const;

export function circleGetWalletRequest(walletId: string): {
  method: "GET";
  path: string;
  url: string;
} {
  const path = `${CIRCLE_WALLET_PATH}/${walletId}`;
  return { method: "GET", path, url: `${CIRCLE_API_BASE_URL}${path}` };
}

export function circleGetTransactionRequest(transactionId: string): {
  method: "GET";
  path: string;
  url: string;
} {
  const path = `${CIRCLE_TRANSACTION_PATH}/${transactionId}`;
  return { method: "GET", path, url: `${CIRCLE_API_BASE_URL}${path}` };
}

export function circleGetEntityPublicKeyRequest(): {
  method: "GET";
  path: string;
  url: string;
} {
  return {
    method: "GET",
    path: CIRCLE_ENTITY_PUBLIC_KEY_PATH,
    url: `${CIRCLE_API_BASE_URL}${CIRCLE_ENTITY_PUBLIC_KEY_PATH}`,
  };
}

export function circleCreateTransferRequest(input: {
  idempotencyKey: string;
  entitySecretCiphertext: string;
  walletId: string;
  destinationAddress: string;
  amountUsdc: string;
}): {
  method: "POST";
  path: string;
  url: string;
  body: {
    idempotencyKey: string;
    entitySecretCiphertext: string;
    walletId: string;
    destinationAddress: string;
    tokenAddress: typeof ARC_TESTNET_USDC_TOKEN_ADDRESS;
    blockchain: typeof CIRCLE_NETWORK;
    amounts: [string];
    feeLevel: typeof CIRCLE_TRANSFER_FEE_LEVEL;
  };
} {
  if (!isCircleUuidV4(input.idempotencyKey)) {
    throw new Error("circle_idempotency_not_uuid_v4");
  }
  return {
    method: "POST",
    path: CIRCLE_TRANSFER_PATH,
    url: `${CIRCLE_API_BASE_URL}${CIRCLE_TRANSFER_PATH}`,
    body: {
      idempotencyKey: input.idempotencyKey,
      entitySecretCiphertext: input.entitySecretCiphertext,
      walletId: input.walletId,
      destinationAddress: input.destinationAddress,
      tokenAddress: ARC_TESTNET_USDC_TOKEN_ADDRESS,
      blockchain: CIRCLE_NETWORK,
      amounts: [input.amountUsdc],
      feeLevel: CIRCLE_TRANSFER_FEE_LEVEL,
    },
  };
}

export const CIRCLE_CREATE_TRANSFER_RESPONSE_SHAPE = {
  data: { id: "uuid", state: "TransactionState" },
} as const;

export const CIRCLE_GET_TRANSACTION_RESPONSE_SHAPE = {
  data: { transaction: { id: "uuid", state: "TransactionState", blockchain: CIRCLE_NETWORK } },
} as const;

export const CIRCLE_CONTRACT_CURRENCY = CIRCLE_CURRENCY;
