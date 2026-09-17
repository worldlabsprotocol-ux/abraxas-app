import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jwtToAddress } from "@mysten/sui/zklogin";
import { fakeGoogleIdToken } from "@/lib/sui/zklogin/testJwt";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.GOOGLE_ZKLOGIN_CLIENT_ID = "540000000000-newclient.apps.googleusercontent.com";
  process.env.GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS = "187000000000-legacyclient.apps.googleusercontent.com";
  process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = "187000000000-legacyclient.apps.googleusercontent.com";
});

import { POST as registerPOST } from "@/app/api/auth/zklogin/register/route";

const LEGACY_AUD = "187000000000-legacyclient.apps.googleusercontent.com";
const NEW_AUD = "540000000000-newclient.apps.googleusercontent.com";
const OAUTH_SUB = "dgv-test-google-sub-12345";
const OTHER_SUB = "other-google-sub-99999";
const USER_SALT = "982451653";

const maybeSingle = vi.fn();
const upsert = vi.fn();
const updateEq = vi.fn();
const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

vi.mock("@/lib/auth/verifyZkLoginIdToken", () => ({
  verifyGoogleZkLoginIdToken: vi.fn(async (idToken: string, expectedSub?: string) => {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
    ) as { sub?: string; aud?: string; email?: string };
    const sub = payload.sub ?? expectedSub ?? OAUTH_SUB;
    if (expectedSub && sub !== expectedSub) {
      throw new Error("oauth_sub mismatch");
    }
    const aud = payload.aud ?? NEW_AUD;
    const trusted = [NEW_AUD, LEGACY_AUD];
    if (!trusted.includes(aud)) {
      throw new Error("untrusted_oauth_audience");
    }
    return { sub, email: payload.email ?? "dgv-test@example.com", aud };
  }),
}));

const mockEnsureZkLoginWalletBinding = vi.fn();

vi.mock("@/lib/credentials/ensureZkLoginWalletBinding", () => ({
  ensureZkLoginWalletBinding: (...args: unknown[]) => mockEnsureZkLoginWalletBinding(...args),
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

function mockExistingIdentity(overrides?: Partial<{ sui_address: string; user_salt: string; email: string }>) {
  const legacyToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: LEGACY_AUD });
  const address = jwtToAddress(legacyToken, USER_SALT);
  maybeSingle.mockResolvedValue({
    data: {
      sui_address: address,
      user_salt: USER_SALT,
      email: "dgv-test@example.com",
      ...overrides,
    },
  });
  return { legacyToken, address };
}

describe("POST /api/auth/zklogin/register", () => {
  const env = { ...process.env };

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.GOOGLE_ZKLOGIN_CLIENT_ID = NEW_AUD;
    process.env.GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS = LEGACY_AUD;
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = LEGACY_AUD;

    maybeSingle.mockReset();
    upsert.mockReset();
    updateEq.mockReset();
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
            eq: updateEq,
          })),
          upsert,
        };
      }),
    });
    upsert.mockResolvedValue({ error: null });
    mockEnsureZkLoginWalletBinding.mockResolvedValue({ status: "ok" });
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("returns 409 with legacy recovery hint when canonical token aud differs from registered identity", async () => {
    const { address } = mockExistingIdentity();
    const newToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: NEW_AUD });

    const res = await postRegister({
      id_token: newToken,
      oauth_sub: OAUTH_SUB,
      provider: "google",
      login_mode: "canonical",
    });

    const json = (await res.json()) as {
      code?: string;
      legacy_recovery_available?: boolean;
      suggested_login_mode?: string;
      error?: string;
    };

    expect(res.status).toBe(409);
    expect(json.code).toBe("zklogin_oauth_audience_mismatch");
    expect(json.error).toMatch(/older sign in setup/i);
    expect(json.legacy_recovery_available).toBe(true);
    expect(json.suggested_login_mode).toBe("legacy_recovery");
    expect(jwtToAddress(newToken, USER_SALT)).not.toBe(address);
  });

  it("suggests canonical after legacy recovery audience mismatch (loop prevention)", async () => {
    const canonicalToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: NEW_AUD });
    const canonicalAddress = jwtToAddress(canonicalToken, USER_SALT);
    maybeSingle.mockResolvedValue({
      data: {
        sui_address: canonicalAddress,
        user_salt: USER_SALT,
        email: "dgv-test@example.com",
      },
    });

    const legacyToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: LEGACY_AUD });

    const res = await postRegister({
      id_token: legacyToken,
      oauth_sub: OAUTH_SUB,
      login_mode: "legacy_recovery",
    });

    const json = (await res.json()) as {
      code?: string;
      suggested_login_mode?: string;
    };

    expect(res.status).toBe(409);
    expect(json.code).toBe("zklogin_oauth_audience_mismatch");
    expect(json.suggested_login_mode).toBe("canonical");
  });

  it("returns legacy_recovery_available false when only server legacy allowlist is configured", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID;
    process.env.GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS = LEGACY_AUD;

    mockExistingIdentity();
    const newToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: NEW_AUD });

    const res = await postRegister({
      id_token: newToken,
      oauth_sub: OAUTH_SUB,
      login_mode: "canonical",
    });

    const json = (await res.json()) as { legacy_recovery_available?: boolean };
    expect(res.status).toBe(409);
    expect(json.legacy_recovery_available).toBe(false);
  });

  it("returns legacy_recovery_available false when public legacy client is not server-allowlisted", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = LEGACY_AUD;
    process.env.GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS = "";

    mockExistingIdentity();
    const newToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: NEW_AUD });

    const res = await postRegister({
      id_token: newToken,
      oauth_sub: OAUTH_SUB,
      login_mode: "canonical",
    });

    const json = (await res.json()) as { legacy_recovery_available?: boolean };
    expect(res.status).toBe(409);
    expect(json.legacy_recovery_available).toBe(false);
  });

  it("signs in legacy trusted identity with preserved address and salt", async () => {
    const { legacyToken, address } = mockExistingIdentity();

    const res = await postRegister({
      id_token: legacyToken,
      oauth_sub: OAUTH_SUB,
      provider: "google",
      login_mode: "legacy_recovery",
    });

    const json = (await res.json()) as {
      sui_address?: string;
      user_salt?: string;
      wallet_binding_status?: string;
    };

    expect(res.status).toBe(200);
    expect(json.sui_address).toBe(address);
    expect(json.user_salt).toBe(USER_SALT);
    expect(json.wallet_binding_status).toBe("ok");
    expect(mockEnsureZkLoginWalletBinding).toHaveBeenCalledWith(address);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("registers new canonical identity when oauth_sub is unknown", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const newToken = fakeGoogleIdToken({ sub: OTHER_SUB, aud: NEW_AUD, email: "new@example.com" } as never);

    const res = await postRegister({
      id_token: newToken,
      oauth_sub: OTHER_SUB,
      provider: "google",
      login_mode: "canonical",
    });

    const json = (await res.json()) as {
      sui_address?: string;
      user_salt?: string;
      wallet_binding_status?: string;
    };

    expect(res.status).toBe(200);
    expect(json.sui_address).toMatch(/^0x[a-f0-9]{64}$/);
    expect(json.user_salt).toBeTruthy();
    expect(json.wallet_binding_status).toBe("ok");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(mockEnsureZkLoginWalletBinding).toHaveBeenCalledWith(json.sui_address);
  });

  it("returns repairable wallet_binding_status when persistence fails for returning user", async () => {
    const { legacyToken, address } = mockExistingIdentity();
    mockEnsureZkLoginWalletBinding.mockResolvedValue({
      status: "failed",
      reason_code: "rpc_failed",
    });

    const res = await postRegister({
      id_token: legacyToken,
      oauth_sub: OAUTH_SUB,
      provider: "google",
      login_mode: "legacy_recovery",
    });

    const json = (await res.json()) as {
      wallet_binding_status?: string;
      wallet_binding_reason_code?: string;
    };

    expect(res.status).toBe(200);
    expect(json.wallet_binding_status).toBe("failed");
    expect(json.wallet_binding_reason_code).toBe("rpc_failed");
    expect(mockEnsureZkLoginWalletBinding).toHaveBeenCalledWith(address);
  });

  it("rejects untrusted audience", async () => {
    const evilToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: "evil.apps.googleusercontent.com" });

    const res = await postRegister({
      id_token: evilToken,
      oauth_sub: OAUTH_SUB,
      provider: "google",
    });

    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("cannot take over an identity using email alone — lookup is oauth_sub only", async () => {
    mockExistingIdentity({ email: "shared@example.com" });
    const attackerToken = fakeGoogleIdToken({
      sub: OTHER_SUB,
      aud: LEGACY_AUD,
      email: "shared@example.com",
    } as never);

    maybeSingle.mockImplementation(async () => ({ data: null }));

    const res = await postRegister({
      id_token: attackerToken,
      oauth_sub: OTHER_SUB,
      provider: "google",
      login_mode: "legacy_recovery",
    });

    expect(res.status).toBe(404);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 503 when preview deployment is bound to production Supabase", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://bztwutzprwsdrtqdpymf.supabase.co";

    const res = await postRegister({
      id_token: fakeGoogleIdToken({ sub: OAUTH_SUB, aud: NEW_AUD }),
      oauth_sub: OAUTH_SUB,
      provider: "google",
    });

    const json = (await res.json()) as { code?: string; expected_supabase_ref?: string };
    expect(res.status).toBe(503);
    expect(json.code).toBe("preview_supabase_not_demo_bound");
    expect(json.expected_supabase_ref).toBe("ocntwbxarpjeixdnzide");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns identity_save_permission_denied when service_role lacks INSERT grant", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    upsert.mockResolvedValue({
      error: { code: "42501", message: "permission denied for table sui_zklogin_identities" },
    });
    const newToken = fakeGoogleIdToken({ sub: OTHER_SUB, aud: NEW_AUD, email: "new@example.com" } as never);

    const res = await postRegister({
      id_token: newToken,
      oauth_sub: OTHER_SUB,
      provider: "google",
      login_mode: "canonical",
    });

    const json = (await res.json()) as { code?: string; error?: string };
    expect(res.status).toBe(500);
    expect(json.code).toBe("identity_save_permission_denied");
    expect(json.error).toBe("Failed to save identity");
  });

  it("does not create duplicate identity on legacy recovery for unknown oauth_sub", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const legacyToken = fakeGoogleIdToken({ sub: OTHER_SUB, aud: LEGACY_AUD });

    const res = await postRegister({
      id_token: legacyToken,
      oauth_sub: OTHER_SUB,
      login_mode: "legacy_recovery",
    });

    const json = (await res.json()) as { code?: string };

    expect(res.status).toBe(404);
    expect(json.code).toBe("zklogin_no_existing_account");
    expect(upsert).not.toHaveBeenCalled();
  });
});
