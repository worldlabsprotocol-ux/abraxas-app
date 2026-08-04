import { describe, expect, it } from "vitest";
import { jwtToAddress } from "@mysten/sui/zklogin";
import { fakeGoogleIdToken } from "@/lib/sui/zklogin/testJwt";

/** Historical production OAuth client (187…) vs Abraxas Web App client (540…). */
const LEGACY_OAUTH_CLIENT_ID = "187000000000-legacyclient.apps.googleusercontent.com";
const NEW_OAUTH_CLIENT_ID = "540000000000-newclient.apps.googleusercontent.com";

describe("zkLogin address derivation — OAuth audience (aud)", () => {
  const oauthSub = "dgv-test-google-sub-12345";
  const userSalt = "982451653";

  it("same sub + salt with different OAuth client IDs produce different Sui addresses", () => {
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const newToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });

    const legacyAddress = jwtToAddress(legacyToken, userSalt);
    const newAddress = jwtToAddress(newToken, userSalt);

    expect(legacyAddress).not.toBe(newAddress);
    expect(legacyAddress).toMatch(/^0x[a-f0-9]{64}$/);
    expect(newAddress).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("re-deriving with a new aud against a legacy-registered address fails the sanity check", () => {
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const newToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });

    const registeredAddress = jwtToAddress(legacyToken, userSalt);
    const derivedFromNewToken = jwtToAddress(newToken, userSalt);

    expect(derivedFromNewToken).not.toBe(registeredAddress);
  });
});
