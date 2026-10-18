// FILE: lib/auth/accountSession.revocation.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetNativeAccountMemory, nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { createNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import {
  ACCOUNT_SESSION_COOKIE,
  issueAccountSessionToken,
  resolveAccountSession,
  revokeCurrentAccountSessionFromRequest,
} from "@/lib/auth/accountSession";
import { DELETE as sessionDelete, GET as sessionGet } from "@/app/api/auth/native/session/route";

describe("account session server-side revocation", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "1";
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET = "01234567890123456789012345678901";
  });

  it("rejects JWT replay after sign-out revokes server session", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const token = await issueAccountSessionToken(accountId, "solana_wallet");
    expect(token).toBeTruthy();
    const cookie = `${ACCOUNT_SESSION_COOKIE}=${token}`;

    const authedReq = new NextRequest("http://localhost:3000/", {
      headers: { cookie },
    });
    expect((await resolveAccountSession(authedReq))?.accountId).toBe(accountId);

    const deleteRes = await sessionDelete(
      new NextRequest("http://localhost:3000/api/auth/native/session", {
        method: "DELETE",
        headers: { cookie },
      }),
    );
    expect(deleteRes.status).toBe(200);
    const deleteJson = (await deleteRes.json()) as { revoked: boolean };
    expect(deleteJson.revoked).toBe(true);

    const replaySession = await resolveAccountSession(authedReq);
    expect(replaySession).toBeNull();

    const getRes = await sessionGet(
      new NextRequest("http://localhost:3000/api/auth/native/session", { headers: { cookie } }),
    );
    const getJson = (await getRes.json()) as { authenticated: boolean };
    expect(getJson.authenticated).toBe(false);
  });

  it("does not revoke other device sessions on sign-out", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const tokenA = await issueAccountSessionToken(accountId, "solana_wallet");
    const tokenB = await issueAccountSessionToken(accountId, "solana_wallet");
    expect(tokenA).not.toBe(tokenB);

    const cookieA = `${ACCOUNT_SESSION_COOKIE}=${tokenA}`;
    const cookieB = `${ACCOUNT_SESSION_COOKIE}=${tokenB}`;

    await sessionDelete(
      new NextRequest("http://localhost:3000/api/auth/native/session", {
        method: "DELETE",
        headers: { cookie: cookieA },
      }),
    );

    expect(await resolveAccountSession(new NextRequest("http://localhost/", { headers: { cookie: cookieA } }))).toBeNull();
    expect(
      (await resolveAccountSession(new NextRequest("http://localhost/", { headers: { cookie: cookieB } })))?.accountId,
    ).toBe(accountId);
  });

  it("revokeCurrentAccountSessionFromRequest is idempotent", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const token = await issueAccountSessionToken(accountId, "passkey");
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `${ACCOUNT_SESSION_COOKIE}=${token}` },
    });
    expect(await revokeCurrentAccountSessionFromRequest(req)).toBe(true);
    expect(await revokeCurrentAccountSessionFromRequest(req)).toBe(false);
  });
});
