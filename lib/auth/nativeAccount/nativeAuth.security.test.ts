// FILE: lib/auth/nativeAccount/nativeAuth.security.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetNativeAccountMemory, nativeAccountMemory } from "./memoryStore";
import { createNativeAccountId } from "./subjectId";
import {
  consumeWebAuthnChallenge,
  insertWebAuthnChallenge,
  loadWebAuthnChallenge,
  upsertPartnerMembership,
  assertPartnerMembership,
} from "./store";
import { issueAccountSessionToken, resolveAccountSession, ACCOUNT_SESSION_COOKIE } from "@/lib/auth/accountSession";
import {
  issuePartnerConsoleSessionToken,
  resolvePartnerConsoleSession,
  PARTNER_CONSOLE_SESSION_COOKIE,
} from "@/lib/partner/launchpad/partnerConsoleSession";

describe("native account security (memory store)", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "true";
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET = "test-account-session-secret-32b";
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-browser-session-secret-32";
  });

  it("rejects replayed WebAuthn challenges", async () => {
    const id = await insertWebAuthnChallenge({
      purpose: "authenticate",
      challenge: "abc",
      origin: "http://localhost:3000",
      rpId: "localhost",
      ttlSec: 60,
    });
    expect(await consumeWebAuthnChallenge(id)).toBe(true);
    expect(await consumeWebAuthnChallenge(id)).toBe(false);
  });

  it("expires challenges by timestamp", async () => {
    const id = await insertWebAuthnChallenge({
      purpose: "register",
      accountId: createNativeAccountId(),
      challenge: "xyz",
      origin: "http://localhost:3000",
      rpId: "localhost",
      ttlSec: -1,
    });
    const row = await loadWebAuthnChallenge(id);
    expect(row).toBeTruthy();
    expect(new Date(row!.expires_at).getTime()).toBeLessThan(Date.now());
  });

  it("issues and resolves account sessions without browser-local identifiers", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const token = await issueAccountSessionToken(accountId);
    expect(token).toBeTruthy();
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `${ACCOUNT_SESSION_COOKIE}=${token}` },
    });
    const session = await resolveAccountSession(req);
    expect(session?.accountId).toBe(accountId);
  });

  it("does not grant partner console access without membership", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const token = await issuePartnerConsoleSessionToken({
      partnerId: "tenant-a",
      environment: "sandbox",
      authKind: "account",
      accountId,
      membershipRole: "owner",
    });
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `${PARTNER_CONSOLE_SESSION_COOKIE}=${token}` },
    });
    const session = await resolvePartnerConsoleSession(req);
    expect(session).toBeNull();
  });

  it("rejects revoked partner memberships for operator sessions", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    await upsertPartnerMembership({ accountId, partnerId: "tenant-revoked", role: "owner" });
    nativeAccountMemory.revokeMembership(accountId, "tenant-revoked");

    const token = await issuePartnerConsoleSessionToken({
      partnerId: "tenant-revoked",
      environment: "sandbox",
      authKind: "account",
      accountId,
      membershipRole: "owner",
    });
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `${PARTNER_CONSOLE_SESSION_COOKIE}=${token}` },
    });
    const session = await resolvePartnerConsoleSession(req);
    expect(session).toBeNull();
  });

  it("enforces partner membership for account-based operator sessions", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    await upsertPartnerMembership({ accountId, partnerId: "tenant-b", role: "owner" });

    const token = await issuePartnerConsoleSessionToken({
      partnerId: "tenant-b",
      environment: "sandbox",
      authKind: "account",
      accountId,
      membershipRole: "owner",
    });
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `${PARTNER_CONSOLE_SESSION_COOKIE}=${token}` },
    });
    const session = await resolvePartnerConsoleSession(req);
    expect(session?.partnerId).toBe("tenant-b");
    expect(session?.authKind).toBe("account");

    const cross = await assertPartnerMembership(accountId, "tenant-other");
    expect(cross.ok).toBe(false);
  });
});

describe("native auth API gate", () => {
  it("returns disabled when feature flag off", async () => {
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "false";
    vi.resetModules();
    const { GET } = await import("@/app/api/auth/native/enabled/route");
    const res = await GET(new NextRequest("http://localhost/"));
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });
});
