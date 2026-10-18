/**
 * Ephemeral wallet auth — no PostgreSQL account tables required.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { resetEphemeralChallengeStoreForTests } from "./challengeStore";
import { resetEphemeralRedisClientForTests } from "./redisClient";
import { resetEphemeralSessionStoreForTests } from "./sessionStore";
import { resetEphemeralSandboxStoreForTests } from "./sandboxWorkspace";
import { EPHEMERAL_WALLET_AUTH_PURPOSE } from "./message";

const integrationEnabled = process.env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";

const testEnv: Record<string, string> = integrationEnabled
  ? {
      ABRAXAS_EPHEMERAL_WALLET_AUTH: "1",
      ABRAXAS_EPHEMERAL_INTEGRATION_TEST: "1",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "ephemeral-integration-session-secret-32",
      NEXT_PUBLIC_SOLANA_NETWORK: "devnet",
      NODE_ENV: "test",
      VITEST: "true",
    }
  : {};

describe.runIf(integrationEnabled)("ephemeral wallet authentication", () => {
  const keypair = Keypair.generate();
  const wallet = keypair.publicKey.toBase58();
  const origin = "http://localhost:3000";

  beforeAll(() => {
    Object.assign(process.env, testEnv);
    resetEphemeralRedisClientForTests();
    resetEphemeralChallengeStoreForTests();
    resetEphemeralSessionStoreForTests();
    resetEphemeralSandboxStoreForTests();
  });

  afterAll(() => {
    resetEphemeralChallengeStoreForTests();
    resetEphemeralSessionStoreForTests();
    resetEphemeralSandboxStoreForTests();
  });

  it("issues session without creating a persistent account record", async () => {
    const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
    const challengeReq = new NextRequest(`${origin}/api/auth/wallet/solana/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, host: "localhost:3000" },
      body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
    });
    const challengeRes = await challengePost(challengeReq);
    expect(challengeRes.status).toBe(200);
    const challengeBody = await challengeRes.json();
    expect(challengeBody.challenge.message).toContain(EPHEMERAL_WALLET_AUTH_PURPOSE);

    const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
    const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
    const signature = Buffer.from(signatureBytes).toString("base64");

    const ctxCookie = challengeRes.headers.get("set-cookie") ?? "";
    const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
    const verifyReq = new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        host: "localhost:3000",
        cookie: ctxCookie,
      },
      body: JSON.stringify({
        challenge_id: challengeBody.challenge.challenge_id,
        wallet_address: wallet,
        solana_network: "devnet",
        signature,
      }),
    });
    const verifyRes = await verifyPost(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.persistent_account_created).toBe(false);

    const sessionCookie = verifyRes.headers.get("set-cookie") ?? "";
    const { GET: sessionGet } = await import("@/app/api/auth/wallet/session/route");
    const sessionRes = await sessionGet(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(sessionRes.status).toBe(200);
    const sessionBody = await sessionRes.json();
    expect(sessionBody.authenticated).toBe(true);
    expect(sessionBody.wallet_address).toBe(wallet);

    const replayVerify = await verifyPost(
      new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          host: "localhost:3000",
          cookie: ctxCookie,
        },
        body: JSON.stringify({
          challenge_id: challengeBody.challenge.challenge_id,
          wallet_address: wallet,
          solana_network: "devnet",
          signature,
        }),
      }),
    );
    expect(replayVerify.status).toBe(409);
    expect((await replayVerify.json()).code).toBe("replay");

    const { DELETE: sessionDel } = await import("@/app/api/auth/wallet/session/route");
    const delRes = await sessionDel(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        method: "DELETE",
        headers: { cookie: sessionCookie },
      }),
    );
    expect(delRes.status).toBe(200);

    const afterRevoke = await sessionGet(
      new NextRequest(`${origin}/api/auth/wallet/session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    expect((await afterRevoke.json()).authenticated).toBe(false);
  });

  it("rejects wrong signer", async () => {
    const { POST: challengePost } = await import("@/app/api/auth/wallet/solana/challenge/route");
    const challengeRes = await challengePost(
      new NextRequest(`${origin}/api/auth/wallet/solana/challenge`, {
        method: "POST",
        headers: { "content-type": "application/json", origin, host: "localhost:3000" },
        body: JSON.stringify({ wallet_address: wallet, solana_network: "devnet" }),
      }),
    );
    const challengeBody = await challengeRes.json();
    const other = Keypair.generate();
    const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
    const signature = Buffer.from(nacl.sign.detached(messageBytes, keypair.secretKey)).toString("base64");
    const { POST: verifyPost } = await import("@/app/api/auth/wallet/solana/verify/route");
    const verifyRes = await verifyPost(
      new NextRequest(`${origin}/api/auth/wallet/solana/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          host: "localhost:3000",
          cookie: challengeRes.headers.get("set-cookie") ?? "",
        },
        body: JSON.stringify({
          challenge_id: challengeBody.challenge.challenge_id,
          wallet_address: other.publicKey.toBase58(),
          solana_network: "devnet",
          signature,
        }),
      }),
    );
    expect(verifyRes.status).toBe(401);
    expect((await verifyRes.json()).code).toBe("wrong_signer");
  });
});
