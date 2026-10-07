// FILE: lib/sui/zklogin/nativeAuthBridge.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";
import {
  inspectZkLoginOAuthState,
  mintZkLoginOAuthState,
  consumeZkLoginOAuthState,
} from "./oauthLoginState";
import {
  resetNativeHandoffStoreForTests,
  mintNativeHandoffCode,
  verifyAndConsumeNativeHandoffCode,
  hashNativeConsumeVerifier,
} from "./nativeHandoff";
import {
  resetNativePendingStoreForTests,
  saveNativeZkLoginPending,
  loadNativeZkLoginPending,
  mintNativeConsumeVerifier,
} from "./nativePendingStore";
import { verifyNativeOAuthNonce } from "./verifyNativeOAuthNonce";

const TEST_SUI = "0x" + "a".repeat(64);

function samplePayload(overrides: Partial<Parameters<typeof mintNativeHandoffCode>[0]["payload"]> = {}) {
  return {
    suiAddress: TEST_SUI,
    email: "holder@example.com",
    provider: "google",
    oauthSub: "google-subject",
    maxEpoch: 120,
    userSalt: "12345",
    ephemeralSecretKey: "secret-key-material",
    randomness: "randomness",
    loginMode: "canonical" as const,
    idToken: "sample-id-token",
    ...overrides,
  };
}

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

  it("stores and loads encrypted native pending sessions with consume verifier", async () => {
    const minted = await mintZkLoginOAuthState("canonical", "android_native");
    const verifier = mintNativeConsumeVerifier();
    expect(minted).toBeTruthy();

    const saved = await saveNativeZkLoginPending({
      jti: minted!.jti,
      consumeVerifier: verifier,
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

  it("VALID_NATIVE_FLOW: mints and consumes opaque handoff code with verifier", async () => {
    const verifier = mintNativeConsumeVerifier();
    const code = await mintNativeHandoffCode({
      oauthJti: "oauth-jti-value",
      consumeVerifierHash: hashNativeConsumeVerifier(verifier),
      payload: samplePayload(),
    });
    expect(code).toBeTruthy();

    const verified = await verifyAndConsumeNativeHandoffCode(code, verifier);
    expect(verified?.suiAddress).toBe(TEST_SUI);
  });

  it("REPLAY_HANDOFF: denies second consume of same code", async () => {
    const verifier = mintNativeConsumeVerifier();
    const code = await mintNativeHandoffCode({
      oauthJti: "oauth-jti-replay",
      consumeVerifierHash: hashNativeConsumeVerifier(verifier),
      payload: samplePayload(),
    });

    expect(await verifyAndConsumeNativeHandoffCode(code, verifier)).toBeTruthy();
    expect(await verifyAndConsumeNativeHandoffCode(code, verifier)).toBeNull();
  });

  it("CONCURRENT_REPLAY: exactly one concurrent consume succeeds", async () => {
    const verifier = mintNativeConsumeVerifier();
    const code = await mintNativeHandoffCode({
      oauthJti: "oauth-jti-concurrent",
      consumeVerifierHash: hashNativeConsumeVerifier(verifier),
      payload: samplePayload(),
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => verifyAndConsumeNativeHandoffCode(code, verifier)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("TAMPERED_HANDOFF: denies wrong verifier", async () => {
    const code = await mintNativeHandoffCode({
      oauthJti: "oauth-jti-tamper",
      consumeVerifierHash: hashNativeConsumeVerifier(mintNativeConsumeVerifier()),
      payload: samplePayload(),
    });
    expect(await verifyAndConsumeNativeHandoffCode(code, mintNativeConsumeVerifier())).toBeNull();
  });

  it("MALFORMED_CONSUME: denies missing code or verifier", async () => {
    expect(await verifyAndConsumeNativeHandoffCode(null, "verifier")).toBeNull();
    expect(await verifyAndConsumeNativeHandoffCode("code", null)).toBeNull();
  });

  it("AUTH_TRANSACTION_BINDING: verifies OAuth nonce against pending ephemeral key", () => {
    const keypair = Ed25519Keypair.generate();
    const secretKey = keypair.getSecretKey();
    const randomness = generateRandomness();
    const maxEpoch = 120;
    const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
    const pending = {
      ephemeralSecretKey: secretKey,
      randomness,
      maxEpoch,
      provider: "google" as const,
      startedAt: new Date().toISOString(),
    };

    const baseClaims = {
      iss: "https://accounts.google.com",
      aud: "test-client.apps.googleusercontent.com",
      sub: "google-subject",
      nonce,
    };
    const payload = Buffer.from(JSON.stringify(baseClaims)).toString("base64url");
    const wrongPayload = Buffer.from(JSON.stringify({ ...baseClaims, nonce: "wrong-nonce" })).toString("base64url");
    expect(verifyNativeOAuthNonce(`eyJhbGciOiJub25lIn0.${payload}.`, pending)).toBe(true);
    expect(verifyNativeOAuthNonce(`eyJhbGciOiJub25lIn0.${wrongPayload}.`, pending)).toBe(false);
  });
});
