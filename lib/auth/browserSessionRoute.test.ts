import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/browser-session/route";
import { fakeGoogleIdToken } from "@/lib/sui/zklogin/testJwt";
import { ZKLOGIN_ERROR_CODES } from "@/lib/sui/zklogin/zkloginErrorCodes";

const LEGACY_AUD = "187000000000-legacyclient.apps.googleusercontent.com";
const OAUTH_SUB = "dgv-test-google-sub-12345";
const SUI_ADDRESS = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const verifyGoogleZkLoginIdToken = vi.fn();
const issueBrowserSessionToken = vi.fn();
const createClient = vi.fn();

vi.mock("@/lib/auth/verifyZkLoginIdToken", () => ({
  verifyGoogleZkLoginIdToken: (...args: unknown[]) => verifyGoogleZkLoginIdToken(...args),
}));

vi.mock("@/lib/auth/browserSession", () => ({
  BROWSER_SESSION_COOKIE: "abraxas_browser_session",
  issueBrowserSessionToken: (...args: unknown[]) => issueBrowserSessionToken(...args),
  attachBrowserSessionCookie: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

describe("POST /api/auth/browser-session", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-browser-session-secret-minimum-length";

    verifyGoogleZkLoginIdToken.mockResolvedValue({ sub: OAUTH_SUB, aud: LEGACY_AUD });
    issueBrowserSessionToken.mockResolvedValue("signed-session-token");
    createClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { sui_address: SUI_ADDRESS } })),
          })),
        })),
      })),
    });
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("mints admin browser session after verified legacy recovery token", async () => {
    const legacyToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: LEGACY_AUD });

    const res = await POST(
      new Request("http://localhost/api/auth/browser-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id_token: legacyToken,
          oauth_sub: OAUTH_SUB,
          sui_address: SUI_ADDRESS,
        }),
      }) as never,
    );

    const json = await res.json() as { ok?: boolean; sui_address?: string; code?: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.sui_address).toBe(SUI_ADDRESS);
    expect(issueBrowserSessionToken).toHaveBeenCalled();
  });

  it("returns structured code when session signing is unavailable", async () => {
    issueBrowserSessionToken.mockResolvedValue(null);
    const legacyToken = fakeGoogleIdToken({ sub: OAUTH_SUB, aud: LEGACY_AUD });

    const res = await POST(
      new Request("http://localhost/api/auth/browser-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id_token: legacyToken,
          oauth_sub: OAUTH_SUB,
          sui_address: SUI_ADDRESS,
        }),
      }) as never,
    );

    const json = await res.json() as { code?: string };
    expect(res.status).toBe(503);
    expect(json.code).toBe(ZKLOGIN_ERROR_CODES.sessionMintFailed);
  });
});
