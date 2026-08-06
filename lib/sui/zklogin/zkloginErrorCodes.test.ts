import { describe, expect, it } from "vitest";
import {
  mapZkLoginVerificationFailure,
  ZKLOGIN_ERROR_CODES,
} from "@/lib/sui/zklogin/zkloginErrorCodes";

describe("zkloginErrorCodes", () => {
  it("maps verification failures to safe structured codes", () => {
    expect(mapZkLoginVerificationFailure(new Error("untrusted_oauth_audience")).code)
      .toBe(ZKLOGIN_ERROR_CODES.untrustedAudience);
    expect(mapZkLoginVerificationFailure(new Error("Google OAuth client ID not configured")).code)
      .toBe(ZKLOGIN_ERROR_CODES.notConfigured);
    expect(mapZkLoginVerificationFailure(new Error("oauth_sub mismatch")).code)
      .toBe(ZKLOGIN_ERROR_CODES.oauthSubMismatch);
    expect(mapZkLoginVerificationFailure(new Error("signature verification failed")).code)
      .toBe(ZKLOGIN_ERROR_CODES.invalidToken);
  });
});
