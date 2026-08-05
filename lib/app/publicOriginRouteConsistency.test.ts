import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as consentPOST } from "@/app/api/v1/verification-requests/[id]/consent/route";
import { GET as publicKeyGET } from "@/app/api/credentials/public-key/route";
import { SITE_URL } from "@/lib/siteUrl";
import { PARTNER_FLOW_OPENAPI_CANONICAL_URL } from "@/lib/partner/partnerFlowOpenApiContract";

const STALE_HOST = "abraxas-app.vercel.app";
const RECEIPT_ID = "dr_test_receipt_001";
const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "ABRAXAS_ISSUER_URL",
  "VERCEL_URL",
  "ABRAXAS_PUBLIC_KEY",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

const consentAndDecide = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: SUI },
  })),
}));

vi.mock("@/lib/verification/requestsService", () => ({
  consentAndDecide: (...args: unknown[]) => consentAndDecide(...args),
}));

function clearOriginEnv() {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreOriginEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
}

function consentRequest(host: string, forwardedHost?: string) {
  const headers: Record<string, string> = {
    host,
    "content-type": "application/json",
  };
  if (forwardedHost) {
    headers["x-forwarded-host"] = forwardedHost;
  }
  return new NextRequest("http://localhost/api/v1/verification-requests/vr-1/consent", {
    method: "POST",
    headers,
  });
}

describe("runtime public origin consistency", () => {
  beforeEach(() => {
    clearOriginEnv();
    vi.clearAllMocks();
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify({ kty: "OKP", crv: "Ed25519", x: "test" });
    consentAndDecide.mockResolvedValue({
      decision: "approved",
      claims: {},
      valid_until: null,
      decision_id: "dec-1",
      receipt_id: RECEIPT_ID,
      reason_codes: [],
    });
  });

  afterEach(() => restoreOriginEnv());

  describe("POST /api/v1/verification-requests/{id}/consent receipt_public_url", () => {
    it("uses canonical production origin when host is abraxasworld.xyz", async () => {
      const res = await consentPOST(consentRequest("abraxasworld.xyz"), {
        params: Promise.resolve({ id: "vr-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.receipt_public_url).toBe(
        `${SITE_URL}/api/receipts/${RECEIPT_ID}/public`,
      );
      expect(json.receipt_public_url).not.toContain(STALE_HOST);
    });

    it("uses configured preview origin from trusted host", async () => {
      process.env.VERCEL_URL = "abraxas-app-preview.vercel.app";

      const res = await consentPOST(
        consentRequest("abraxas-app-preview.vercel.app"),
        { params: Promise.resolve({ id: "vr-1" }) },
      );
      const json = await res.json();

      expect(json.receipt_public_url).toBe(
        `https://abraxas-app-preview.vercel.app/api/receipts/${RECEIPT_ID}/public`,
      );
      expect(json.receipt_public_url).not.toContain(STALE_HOST);
    });

    it("uses localhost for local development host", async () => {
      const res = await consentPOST(consentRequest("localhost:3000"), {
        params: Promise.resolve({ id: "vr-1" }),
      });
      const json = await res.json();

      expect(json.receipt_public_url).toBe(
        `http://localhost:3000/api/receipts/${RECEIPT_ID}/public`,
      );
    });

    it("does not trust attacker-controlled x-forwarded-host", async () => {
      process.env.NEXT_PUBLIC_APP_URL = SITE_URL;

      const res = await consentPOST(
        consentRequest("abraxasworld.xyz", "evil.example"),
        { params: Promise.resolve({ id: "vr-1" }) },
      );
      const json = await res.json();

      expect(json.receipt_public_url).toBe(
        `${SITE_URL}/api/receipts/${RECEIPT_ID}/public`,
      );
      expect(json.receipt_public_url).not.toContain("evil.example");
      expect(json.receipt_public_url).not.toContain(STALE_HOST);
    });
  });

  describe("GET /api/credentials/public-key issuer", () => {
    it("defaults issuer to canonical production origin when env is unset", async () => {
      const res = await publicKeyGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.issuer).toBe(SITE_URL);
      expect(json.issuer).not.toContain(STALE_HOST);
    });

    it("uses configured preview origin when NEXT_PUBLIC_APP_URL is set", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://preview.example.com/";

      const res = await publicKeyGET();
      const json = await res.json();

      expect(json.issuer).toBe("https://preview.example.com");
      expect(json.issuer).not.toContain(STALE_HOST);
    });

    it("matches OpenAPI integrator canonical server URL", async () => {
      const res = await publicKeyGET();
      const json = await res.json();

      expect(json.issuer).toBe(new URL(PARTNER_FLOW_OPENAPI_CANONICAL_URL).origin);
    });
  });
});
