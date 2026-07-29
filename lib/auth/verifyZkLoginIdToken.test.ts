// FILE: lib/auth/verifyZkLoginIdToken.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { verifyGoogleZkLoginIdToken } from "./verifyZkLoginIdToken";

describe("verifyGoogleZkLoginIdToken", () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  });

  afterEach(() => {
    if (originalClientId === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = originalClientId;
    }
  });

  it("rejects missing client id configuration", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID;
    delete process.env.GOOGLE_ZKLOGIN_CLIENT_ID;
    await expect(verifyGoogleZkLoginIdToken("not-a-jwt")).rejects.toThrow(
      "Google OAuth client ID not configured",
    );
  });

  it("rejects malformed tokens", async () => {
    await expect(verifyGoogleZkLoginIdToken("not-a-jwt", "sub-1")).rejects.toThrow();
  });
});
