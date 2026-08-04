import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jwtToAddress } from "@mysten/sui/zklogin";
import { fakeGoogleIdToken } from "@/lib/sui/zklogin/testJwt";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

import { POST as registerPOST } from "@/app/api/auth/zklogin/register/route";

const LEGACY_AUD = "187000000000-legacyclient.apps.googleusercontent.com";
const NEW_AUD = "540000000000-newclient.apps.googleusercontent.com";
const OAUTH_SUB = "dgv-test-google-sub-12345";
const USER_SALT = "982451653";

const maybeSingle = vi.fn();
const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

vi.mock("@/lib/auth/verifyZkLoginIdToken", () => ({
  verifyGoogleZkLoginIdToken: vi.fn(async (idToken: string, expectedSub?: string) => {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
    ) as { sub?: string };
    const sub = payload.sub ?? expectedSub ?? OAUTH_SUB;
    if (expectedSub && sub !== expectedSub) {
      throw new Error("oauth_sub mismatch");
    }
    return { sub, email: "dgv-test@example.com" };
  }),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  upsertClaims: vi.fn(),
  upsertWalletBinding: vi.fn(),
}));

function postRegister(body: Record<string, unknown>) {
  return registerPOST(
    new Request("http://localhost/api/auth/zklogin/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/zklogin/register", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    maybeSingle.mockReset();
    createClient.mockReset();
    createClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table !== "sui_zklogin_identities") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: maybeSingle,
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(),
          })),
        };
      }),
    });
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("returns 409 zklogin_oauth_audience_mismatch when token aud differs from registered identity", async () => {
    const legacyToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: LEGACY_AUD });
    const newToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: NEW_AUD });
    const legacyAddress = jwtToAddress(legacyToken, USER_SALT);

    maybeSingle.mockResolvedValue({
      data: {
        sui_address: legacyAddress,
        user_salt: USER_SALT,
        email: "dgv-test@example.com",
      },
    });

    const res = await postRegister({
      id_token: newToken,
      oauth_sub: OAUTH_SUB,
      provider: "google",
      max_epoch: 110,
    });

    const json = (await res.json()) as { code?: string; error?: string };

    expect(res.status).toBe(409);
    expect(json.code).toBe("zklogin_oauth_audience_mismatch");
    expect(json.error).toContain("OAuth client ID no longer matches");
    expect(jwtToAddress(newToken, USER_SALT)).not.toBe(legacyAddress);
  });
});
