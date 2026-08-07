import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  consumeZkLoginOAuthState,
  mintZkLoginOAuthState,
  resetZkLoginOAuthStateForTests,
  ZKLOGIN_OAUTH_STATE_TYP,
} from "./oauthLoginState";

describe("oauthLoginState security", () => {
  const env = { ...process.env };

  beforeEach(() => {
    resetZkLoginOAuthStateForTests();
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-browser-session-secret-value";
  });

  afterEach(() => {
    process.env = { ...env };
    resetZkLoginOAuthStateForTests();
  });

  it("mints cryptographically random unique state values per attempt", async () => {
    const first = await mintZkLoginOAuthState("canonical");
    const second = await mintZkLoginOAuthState("canonical");
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.oauthState).not.toBe(second!.oauthState);
    expect(first!.jti).not.toBe(second!.jti);
  });

  it("binds canonical mode to signed state", async () => {
    const minted = await mintZkLoginOAuthState("canonical");
    expect(minted).not.toBeNull();
    const consumed = await consumeZkLoginOAuthState(minted!.oauthState, minted!.jti);
    expect(consumed).toEqual({ ok: true, mode: "canonical", jti: minted!.jti });
  });

  it("binds legacy_recovery mode to signed state", async () => {
    const minted = await mintZkLoginOAuthState("legacy_recovery");
    expect(minted).not.toBeNull();
    const consumed = await consumeZkLoginOAuthState(minted!.oauthState, minted!.jti);
    expect(consumed).toEqual({ ok: true, mode: "legacy_recovery", jti: minted!.jti });
  });

  it("rejects tampered state", async () => {
    const minted = await mintZkLoginOAuthState("canonical");
    const tampered = `${minted!.oauthState.slice(0, -1)}X`;
    const consumed = await consumeZkLoginOAuthState(tampered, minted!.jti);
    expect(consumed.ok).toBe(false);
    if (!consumed.ok) expect(consumed.reason).toBe("tampered");
  });

  it("rejects replayed state (single-use)", async () => {
    const minted = await mintZkLoginOAuthState("canonical");
    const first = await consumeZkLoginOAuthState(minted!.oauthState, minted!.jti);
    const second = await consumeZkLoginOAuthState(minted!.oauthState, minted!.jti);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("replayed");
  });

  it("rejects expired state", async () => {
    const secret = new TextEncoder().encode(process.env.ABRAXAS_BROWSER_SESSION_SECRET);
    const jti = "expired-jti-test-value";
    const nowSec = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({
      typ: ZKLOGIN_OAUTH_STATE_TYP,
      mode: "canonical",
      jti,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti(jti)
      .setIssuedAt(nowSec - 120)
      .setExpirationTime(nowSec - 60)
      .sign(secret);

    const consumed = await consumeZkLoginOAuthState(expired, jti);
    expect(consumed.ok).toBe(false);
    if (!consumed.ok) expect(consumed.reason).toBe("expired");
  });

  it("rejects cookie mismatch", async () => {
    const minted = await mintZkLoginOAuthState("canonical");
    const consumed = await consumeZkLoginOAuthState(minted!.oauthState, "wrong-jti");
    expect(consumed.ok).toBe(false);
    if (!consumed.ok) expect(consumed.reason).toBe("cookie_mismatch");
  });

  it("rejects missing state", async () => {
    const consumed = await consumeZkLoginOAuthState(null, "jti");
    expect(consumed.ok).toBe(false);
    if (!consumed.ok) expect(consumed.reason).toBe("missing");
  });
});
