// FILE: lib/auth/nativeAccount/solanaAuth/solanaAuth.api.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { NextRequest } from "next/server";
import { resetNativeAccountMemory } from "../memoryStore";
import { encodeAccountSolanaSignInMessage } from "./message";
import { POST as challengePost } from "@/app/api/auth/native/solana/challenge/route";
import { POST as verifyPost } from "@/app/api/auth/native/solana/verify/route";
import { GET as sessionGet, DELETE as sessionDelete } from "@/app/api/auth/native/session/route";

const ORIGIN = "http://localhost:3000";

describe("Solana account auth API routes", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "1";
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET = "01234567890123456789012345678901";
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
  });

  async function fullSignIn(wallet: Keypair): Promise<{ accountId: string; setCookie: string }> {
    const challengeReq = new NextRequest(`${ORIGIN}/api/auth/native/solana/challenge`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({
        wallet_address: wallet.publicKey.toBase58(),
        solana_network: "devnet",
      }),
    });
    const challengeRes = await challengePost(challengeReq);
    expect(challengeRes.status).toBe(200);
    const challengeJson = (await challengeRes.json()) as {
      challenge: { challenge_id: string; message: string };
    };
    const ctxCookie = challengeRes.headers.get("set-cookie") ?? "";

    const messageBytes = encodeAccountSolanaSignInMessage(challengeJson.challenge.message);
    const signature = Buffer.from(
      nacl.sign.detached(messageBytes, wallet.secretKey),
    ).toString("base64");

    const verifyReq = new NextRequest(`${ORIGIN}/api/auth/native/solana/verify`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        "content-type": "application/json",
        cookie: ctxCookie.split(";")[0] ?? "",
      },
      body: JSON.stringify({
        challenge_id: challengeJson.challenge.challenge_id,
        wallet_address: wallet.publicKey.toBase58(),
        solana_network: "devnet",
        signature,
      }),
    });
    const verifyRes = await verifyPost(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyJson = (await verifyRes.json()) as { account_id: string };
    const sessionCookie = verifyRes.headers.get("set-cookie") ?? "";
    return { accountId: verifyJson.account_id, setCookie: sessionCookie.split(";")[0] ?? "" };
  }

  it("establishes session and returns same account on return sign-in", async () => {
    const wallet = Keypair.generate();
    const first = await fullSignIn(wallet);

    const sessionReq = new NextRequest(`${ORIGIN}/api/auth/native/session`, {
      headers: { cookie: first.setCookie },
    });
    const sessionRes = await sessionGet(sessionReq);
    const sessionJson = (await sessionRes.json()) as {
      authenticated: boolean;
      account_id: string;
      wallet_address: string | null;
    };
    expect(sessionJson.authenticated).toBe(true);
    expect(sessionJson.account_id).toBe(first.accountId);
    expect(sessionJson.wallet_address).toBe(wallet.publicKey.toBase58());

    const signOutReq = new NextRequest(`${ORIGIN}/api/auth/native/session`, {
      method: "DELETE",
      headers: { cookie: first.setCookie },
    });
    const signOutRes = await sessionDelete(signOutReq);
    expect(signOutRes.status).toBe(200);

    const afterSignOut = await sessionGet(new NextRequest(`${ORIGIN}/api/auth/native/session`));
    const afterJson = (await afterSignOut.json()) as { authenticated: boolean };
    expect(afterJson.authenticated).toBe(false);

    const second = await fullSignIn(wallet);
    expect(second.accountId).toBe(first.accountId);
  });

  it("rejects verify without challenge context cookie", async () => {
    const wallet = Keypair.generate();
    const verifyReq = new NextRequest(`${ORIGIN}/api/auth/native/solana/verify`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: "asac_missing",
        wallet_address: wallet.publicKey.toBase58(),
        solana_network: "devnet",
        signature: "AA==",
      }),
    });
    const verifyRes = await verifyPost(verifyReq);
    expect(verifyRes.status).toBe(400);
  });
});
