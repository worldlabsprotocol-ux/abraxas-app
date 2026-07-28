// FILE: lib/sui/zklogin/emailFromToken.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@mysten/sui/zklogin", () => ({
  decodeJwt: vi.fn(),
}));

import { decodeJwt } from "@mysten/sui/zklogin";
import { emailFromJwtPayload, emailFromIdToken, tryDecodeIdToken } from "./emailFromToken";

describe("emailFromToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads email from jwt payload", () => {
    expect(emailFromJwtPayload({ email: "user@example.com" })).toBe("user@example.com");
    expect(emailFromJwtPayload({ email: "bad" })).toBeNull();
    expect(emailFromJwtPayload({})).toBeNull();
  });

  it("reads email from id_token", () => {
    vi.mocked(decodeJwt).mockReturnValue({ sub: "123", email: "pilot@abraxas.world" } as never);
    expect(emailFromIdToken("token")).toBe("pilot@abraxas.world");
    expect(tryDecodeIdToken("token")).toMatchObject({ sub: "123" });
  });

  it("returns null for invalid token", () => {
    vi.mocked(decodeJwt).mockImplementation(() => {
      throw new Error("invalid");
    });
    expect(emailFromIdToken("not-a-jwt")).toBeNull();
    expect(tryDecodeIdToken("not-a-jwt")).toBeNull();
  });
});
