// FILE: lib/settlement/circle/client.server.ts
import "server-only";
// Circle developer-controlled wallets client. Server-only. Never imported from client components.

import { publicEncrypt, constants as cryptoConstants, randomUUID } from "node:crypto";
import {
  sealCircleAuthenticatedResult,
  type CircleAuthenticatedResult,
} from "@/lib/settlement/circle/authenticated.server";
import { parseOfficialProviderState } from "@/lib/settlement/circle/authenticated";
import { formatUsdcFromMinor, parseUsdcStringToMinor } from "@/lib/settlement/circle/amount";
import { credentialsReady, readCircleCredentialProbe } from "@/lib/settlement/circle/availability";
import {
  circleCreateTransferRequest,
  circleGetEntityPublicKeyRequest,
  circleGetTransactionRequest,
  circleGetWalletRequest,
} from "@/lib/settlement/circle/contract";
import type { CircleWalletsPort } from "@/lib/settlement/circle/port";
import {
  CIRCLE_API_BASE_URL,
  CIRCLE_CURRENCY,
  CIRCLE_NETWORK,
} from "@/lib/settlement/circle/constants";

export type { CircleWalletsPort };

interface CircleWalletRecord {
  id?: string;
  blockchain?: string;
  address?: string;
  walletSetId?: string;
  state?: string;
}

interface CircleTransactionRecord {
  id?: string;
  state?: string;
  blockchain?: string;
  amounts?: string[];
  createDate?: string;
  updateDate?: string;
  tokenId?: string;
}

function entitySecretBytes(secret: string): Buffer | null {
  const trimmed = secret.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) return null;
  return Buffer.from(trimmed, "hex");
}

function encryptEntitySecret(entitySecret: string, publicKeyPem: string): string | null {
  const secret = entitySecretBytes(entitySecret);
  if (!secret) return null;
  const encrypted = publicEncrypt(
    {
      key: publicKeyPem,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    secret,
  );
  return encrypted.toString("base64");
}

function circleHeaders(apiKey: string, requestId: string): Record<string, string> {
  return {
    authorization: `Bearer ${apiKey}`,
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "abraxas-circle-arc-testnet",
    "x-request-id": requestId,
  };
}

async function circleFetch(input: {
  apiKey: string;
  path: string;
  method?: string;
  body?: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const requestId = randomUUID();
  const res = await fetch(`${CIRCLE_API_BASE_URL}${input.path}`, {
    method: input.method ?? "GET",
    headers: circleHeaders(input.apiKey, requestId),
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });
  let json: Record<string, unknown> | null = null;
  try {
    json = await res.json() as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function parseWallet(json: Record<string, unknown> | null): CircleWalletRecord | null {
  const data = asRecord(json?.data);
  const wallet = asRecord(data.wallet ?? data);
  if (typeof wallet.id !== "string") return null;
  return {
    id: wallet.id,
    blockchain: typeof wallet.blockchain === "string" ? wallet.blockchain : undefined,
    address: typeof wallet.address === "string" ? wallet.address : undefined,
    walletSetId: typeof wallet.walletSetId === "string" ? wallet.walletSetId : undefined,
    state: typeof wallet.state === "string" ? wallet.state : undefined,
  };
}

function parseTransaction(
  json: Record<string, unknown> | null,
  fallbackRequestRef: string,
  expectedAmountMinor: number,
): CircleAuthenticatedResult | null {
  const data = asRecord(json?.data);
  const tx = asRecord(data.transaction ?? data) as CircleTransactionRecord;
  const id = typeof tx.id === "string" ? tx.id : null;
  const state = parseOfficialProviderState(tx.state);
  if (!id || !state) return null;
  if (tx.blockchain && tx.blockchain !== CIRCLE_NETWORK) return null;
  const amountRaw = Array.isArray(tx.amounts) && typeof tx.amounts[0] === "string" ? tx.amounts[0] : null;
  const amountMinor = amountRaw ? parseUsdcStringToMinor(amountRaw) : expectedAmountMinor;
  if (amountMinor == null || amountMinor !== expectedAmountMinor) return null;
  return sealCircleAuthenticatedResult({
    providerRequestRef: fallbackRequestRef || id,
    circleTransactionId: id,
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amountMinor,
    providerState: state,
    occurredAt: String(tx.updateDate ?? tx.createDate ?? new Date().toISOString()),
  });
}

export function createCircleWalletsPortFromEnv(): CircleWalletsPort | null {
  const probe = readCircleCredentialProbe();
  if (!credentialsReady(probe)) return null;
  const apiKey = process.env.CIRCLE_API_KEY!.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET!.trim();
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID!.trim();
  const sourceWalletId = process.env.CIRCLE_DEMO_SOURCE_WALLET_ID!.trim();
  const destinationWalletId = process.env.CIRCLE_DEMO_DESTINATION_WALLET_ID!.trim();

  async function requireCiphertext(): Promise<string | null> {
    const keyReq = circleGetEntityPublicKeyRequest();
    const keyRes = await circleFetch({ apiKey, path: keyReq.path, method: keyReq.method });
    const publicKey = String(asRecord(keyRes.json?.data).publicKey ?? "");
    if (!keyRes.ok || !publicKey.includes("BEGIN")) return null;
    return encryptEntitySecret(entitySecret, publicKey);
  }

  async function getWallet(walletId: string): Promise<CircleWalletRecord | null> {
    const req = circleGetWalletRequest(walletId);
    const res = await circleFetch({ apiKey, path: req.path, method: req.method });
    if (!res.ok) return null;
    const wallet = parseWallet(res.json);
    if (!wallet || wallet.blockchain !== CIRCLE_NETWORK) return null;
    if (wallet.walletSetId && wallet.walletSetId !== walletSetId) return null;
    return wallet;
  }

  return {
    async authenticateAgainstArcTestnet() {
      const source = await getWallet(sourceWalletId);
      const destination = await getWallet(destinationWalletId);
      if (!source || !destination) return { ok: false, code: "circle_wrong_network" };
      return { ok: true, network: CIRCLE_NETWORK };
    },
    async createTestnetUsdcTransfer(input) {
      const source = await getWallet(sourceWalletId);
      const destination = await getWallet(destinationWalletId);
      if (!source?.address || !destination?.address) {
        return { ok: false, code: "circle_wrong_network" };
      }
      const ciphertext = await requireCiphertext();
      if (!ciphertext) return { ok: false, code: "circle_unavailable" };
      const transfer = circleCreateTransferRequest({
        idempotencyKey: input.idempotencyKey,
        entitySecretCiphertext: ciphertext,
        walletId: sourceWalletId,
        destinationAddress: destination.address,
        amountUsdc: formatUsdcFromMinor(input.amountMinor),
      });
      const res = await circleFetch({
        apiKey,
        path: transfer.path,
        method: transfer.method,
        body: transfer.body,
      });
      const sealed = parseTransaction(res.json, input.idempotencyKey, input.amountMinor);
      if (!res.ok || !sealed) return { ok: false, code: "circle_unavailable" };
      return { ok: true, result: sealed };
    },
    async getTransaction(transactionId, expectedAmountMinor) {
      const req = circleGetTransactionRequest(transactionId);
      const res = await circleFetch({
        apiKey,
        path: req.path,
        method: req.method,
      });
      const data = asRecord(res.json?.data);
      const tx = asRecord(data.transaction ?? data);
      const amountRaw = Array.isArray(tx.amounts) && typeof tx.amounts[0] === "string"
        ? tx.amounts[0]
        : null;
      const amountMinor = amountRaw ? parseUsdcStringToMinor(amountRaw) : expectedAmountMinor;
      if (!res.ok || amountMinor == null) return { ok: false, code: "circle_unavailable" };
      const sealed = parseTransaction(res.json, transactionId, amountMinor);
      if (!sealed) return { ok: false, code: "circle_unavailable" };
      return { ok: true, result: sealed };
    },
  };
}
