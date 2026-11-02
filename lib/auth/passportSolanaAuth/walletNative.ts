import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { PublicKey } from "@solana/web3.js";
import { HOLDER_AUTH_CHALLENGE_TTL_MS } from "@/lib/auth/holderSubject/contract";
import { caip10Solana } from "@/lib/auth/holderSubject/caip";
import { buildPassportSolanaAuthMessage } from "./message";
import { canonicalizeSolanaNetwork, resolveAuthorizedSolanaNetworkFromEnv } from "./network";
import { verifyPassportSolanaPersonalMessage } from "./verifySignature";
import { ephemeralKvGetDel, ephemeralKvSet } from "@/lib/auth/ephemeralWallet/redisKv";
import {
  authoritativeChallengeReplayBackend,
  processChallengeStoreAllowed,
  requiresDistributedChallengeStore,
} from "@/lib/auth/ephemeralWallet/transientStatePolicy";

export const WALLET_NATIVE_CHALLENGE_COOKIE = "abx_wallet_native_challenge";
const CHALLENGE_KEY_PREFIX = "abraxas:passport:wallet-native-challenge:v1:";
const localChallenges = new Map<string, string>();

function challengeKey(challengeId: string): string {
  return `${CHALLENGE_KEY_PREFIX}${challengeId}`;
}

async function storeChallenge(challengeId: string, token: string): Promise<boolean> {
  if (authoritativeChallengeReplayBackend() === "redis") {
    await ephemeralKvSet(challengeKey(challengeId), token, Math.ceil(HOLDER_AUTH_CHALLENGE_TTL_MS / 1000));
    return true;
  }
  if (requiresDistributedChallengeStore() || !processChallengeStoreAllowed()) return false;
  localChallenges.set(challengeId, token);
  return true;
}

async function consumeChallenge(challengeId: string): Promise<string | null> {
  if (authoritativeChallengeReplayBackend() === "redis") {
    return ephemeralKvGetDel<string>(challengeKey(challengeId));
  }
  if (requiresDistributedChallengeStore() || !processChallengeStoreAllowed()) return null;
  const token = localChallenges.get(challengeId) ?? null;
  localChallenges.delete(challengeId);
  return token;
}

function secret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  return raw ? new TextEncoder().encode(raw) : null;
}

export function walletNativeSubjectId(caip10: string): string {
  const digest = createHash("sha256")
    .update(`abraxas:wallet-subject:v1:${caip10}`)
    .digest("hex")
    .slice(0, 32);
  return `abx_hs_${digest}`;
}

export async function issueWalletNativeChallenge(input: {
  origin: string;
  walletAddress: string;
  solanaNetwork: string;
  sessionContext: string;
}) {
  const signingSecret = secret();
  if (!signingSecret) return { ok: false as const, code: "session_unavailable" };
  const authorized = resolveAuthorizedSolanaNetworkFromEnv();
  const network = canonicalizeSolanaNetwork(input.solanaNetwork);
  if (!authorized) return { ok: false as const, code: "network_config_invalid" };
  if (!network || network !== authorized) return { ok: false as const, code: "wrong_network" };

  let wallet: string;
  try { wallet = new PublicKey(input.walletAddress.trim()).toBase58(); }
  catch { return { ok: false as const, code: "invalid_input" }; }

  const challengeId = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + HOLDER_AUTH_CHALLENGE_TTL_MS).toISOString();
  const message = buildPassportSolanaAuthMessage({
    origin: new URL(input.origin).origin,
    walletAddress: wallet,
    solanaNetwork: network,
    intendedAction: "passport_sign_in",
    nonce,
    expiresAt,
    sessionContext: input.sessionContext,
  });
  const token = await new SignJWT({ wallet, network, origin: new URL(input.origin).origin, message, ctx: input.sessionContext })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(challengeId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(new Date(expiresAt).getTime() / 1000))
    .sign(signingSecret);
  try {
    if (!await storeChallenge(challengeId, token)) {
      return { ok: false as const, code: "replay_store_unavailable" };
    }
  } catch {
    return { ok: false as const, code: "replay_store_unavailable" };
  }
  return { ok: true as const, token, challenge: { challenge_id: challengeId, message, expires_at: expiresAt, solana_network: network } };
}

export async function verifyWalletNativeChallenge(input: {
  token: string;
  challengeId: string;
  walletAddress: string;
  solanaNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
}) {
  const signingSecret = secret();
  if (!signingSecret) return { ok: false as const, code: "session_unavailable" };
  try {
    const storedToken = await consumeChallenge(input.challengeId);
    if (!storedToken || storedToken !== input.token) return { ok: false as const, code: "replay" };
    const { payload } = await jwtVerify(input.token, signingSecret, { algorithms: ["HS256"] });
    const wallet = new PublicKey(input.walletAddress.trim()).toBase58();
    const origin = new URL(input.requestOrigin).origin;
    const network = canonicalizeSolanaNetwork(input.solanaNetwork);
    if (!network || payload.jti !== input.challengeId || payload.wallet !== wallet || payload.network !== network
      || payload.origin !== origin || payload.ctx !== input.sessionContext || typeof payload.message !== "string") {
      return { ok: false as const, code: "challenge_mismatch" };
    }
    if (!verifyPassportSolanaPersonalMessage({ message: payload.message, signature: input.signature, walletAddress: wallet })) {
      return { ok: false as const, code: "invalid_signature" };
    }
    const caip = caip10Solana(network, wallet).caip10;
    return { ok: true as const, holderSubjectId: walletNativeSubjectId(caip), caip10: caip, created: false };
  } catch {
    return { ok: false as const, code: "expired_or_invalid_challenge" };
  }
}
