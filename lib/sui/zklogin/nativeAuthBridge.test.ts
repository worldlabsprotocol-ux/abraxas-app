// FILE: lib/sui/zklogin/nativeAuthBridge.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  inspectZkLoginOAuthState,
  mintZkLoginOAuthState,
  consumeZkLoginOAuthState,
} from "./oauthLoginState";
import {
  resetNativeHandoffStoreForTests,
  mintNativeHandoffToken,
  verifyAndConsumeNativeHandoffToken,
} from "./nativeHandoff";
import {
  resetNativePendingStoreForTests,
  saveNativeZkLoginPending,
  loadNativeZkLoginPending,
} from "./nativePendingStore";

describe("native auth bridge", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "native-auth-bridge-test-secret";
    resetNativeHandoffStoreForTests();
    resetNativePendingStoreForTests();
  });

  afterEach(() => {
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
    resetNativeHandoffStoreForTests();
    resetNativePendingStoreForTests();
  });

  it("stores holder_platform in OAuth state and skips cookie binding for native consume", async () => {
    const minted = await mintZkLoginOAuthState("canonical", "android_native");
    expect(minted).toBeTruthy();

    const inspected = await inspectZkLoginOAuthState(minted!.oauthState);
    expect(inspected?.holderPlatform).toBe("android_native");

    const consumed = await consumeZkLoginOAuthState(minted!.oauthState, null);
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.holderPlatform).toBe("android_native");
    }
  });

  it("stores and loads encrypted native pending sessions", async () => {
    const minted = await mintZkLoginOAuthState("canonical", "android_native");
    expect(minted).toBeTruthy();

    const saved = await saveNativeZkLoginPending({
      jti: minted!.jti,
      session: {
        ephemeralSecretKey: "secret-key-material",
        randomness: "randomness",
        maxEpoch: 120,
        provider: "google",
        loginMode: "canonical",
        startedAt: new Date().toISOString(),
      },
    });
    expect(saved).toBe(true);

    const loaded = await loadNativeZkLoginPending(minted!.jti);
    expect(loaded?.maxEpoch).toBe(120);
    expect(loaded?.ephemeralSecretKey).toBe("secret-key-material");
  });

  it("mints and consumes one-time native handoff tokens", async () => {
    const token = await mintNativeHandoffToken({
      suiAddress: "0x" + "a".repeat(64),
      email: "holder@example.com",
    });
    expect(token).toBeTruthy();

    const verified = await verifyAndConsumeNativeHandoffToken(token);
    expect(verified?.suiAddress).toBe("0x" + "a".repeat(64));

    const replay = await verifyAndConsumeNativeHandoffToken(token);
    expect(replay).toBeNull();
  });
});
