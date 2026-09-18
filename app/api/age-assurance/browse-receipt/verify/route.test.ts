// FILE: app/api/age-assurance/browse-receipt/verify/route.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  buildBrowseReceiptPayload,
  signBrowseAccessReceipt,
} from "@/lib/assurance/selfAttestation/browseReceipt";

const mockGetLedger = vi.fn();

vi.mock("@/lib/assurance/selfAttestation/selfAttestationLedger", () => ({
  getSelfAttestationByReceiptId: (...args: unknown[]) => mockGetLedger(...args),
}));

import { POST } from "./route";

const TEST_KEY = generateTestSigningKeyPair();
const RECEIPT_ID = "br_audit_fixture";

function verifyRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("https://example.test/api/age-assurance/browse-receipt/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function signedBrowseToken(overrides: {
  policyId?: string;
  partnerId?: string;
  expiresAt?: string;
} = {}): Promise<string> {
  const issuedAt = new Date().toISOString();
  const payload = buildBrowseReceiptPayload({
    receiptId: RECEIPT_ID,
    partnerId: overrides.partnerId ?? GOOD_TROUBLE_PARTNER_ID,
    policyId: overrides.policyId ?? GOOD_TROUBLE_BROWSE_POLICY_ID,
    ageBand: "over_21",
    issuedAt,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 3600000).toISOString(),
    nonce: "nonce-audit",
  });
  const token = await signBrowseAccessReceipt(payload);
  if (!token) throw new Error("signing failed");
  return token;
}

describe("POST /api/age-assurance/browse-receipt/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(TEST_KEY.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
    mockGetLedger.mockResolvedValue({
      browse_receipt_id: RECEIPT_ID,
      revoked_at: null,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
  });

  afterEach(() => {
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("verifies browse receipt with valid_for_purchase=false", async () => {
    const token = await signedBrowseToken();
    const res = await POST(verifyRequest({
      browse_receipt: token,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; valid_for_purchase?: boolean; assurance_level?: string };
    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);
    expect(json.valid_for_purchase).toBe(false);
    expect(json.assurance_level).toBe("L0");
  });

  it("rejects browse receipt presented against retail policy", async () => {
    const token = await signedBrowseToken();
    const res = await POST(verifyRequest({
      browse_receipt: token,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; code?: string };
    expect(res.status).toBe(400);
    expect(json.verified).toBe(false);
    expect(json.code).toBe("context_mismatch");
  });

  it("rejects invalid signature", async () => {
    const res = await POST(verifyRequest({
      browse_receipt: "invalid.jwt.token",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; code?: string };
    expect(res.status).toBe(400);
    expect(json.verified).toBe(false);
    expect(json.code).toBe("signature_invalid");
  });

  it("rejects expired ledger attestation", async () => {
    const token = await signedBrowseToken();
    mockGetLedger.mockResolvedValue({
      browse_receipt_id: RECEIPT_ID,
      revoked_at: null,
      expires_at: new Date(Date.now() - 3600000).toISOString(),
    });
    const res = await POST(verifyRequest({
      browse_receipt: token,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; code?: string };
    expect(res.status).toBe(400);
    expect(json.verified).toBe(false);
    expect(json.code).toBe("attestation_inactive");
  });

  it("rejects revoked ledger attestation", async () => {
    const token = await signedBrowseToken();
    mockGetLedger.mockResolvedValue({
      browse_receipt_id: RECEIPT_ID,
      revoked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
    const res = await POST(verifyRequest({
      browse_receipt: token,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; code?: string };
    expect(res.status).toBe(400);
    expect(json.verified).toBe(false);
    expect(json.code).toBe("attestation_inactive");
  });

  it("rejects wrong-policy JWT payload", async () => {
    const token = await signedBrowseToken({ policyId: "wrong-policy-id" });
    const res = await POST(verifyRequest({
      browse_receipt: token,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; code?: string };
    expect(res.status).toBe(400);
    expect(json.verified).toBe(false);
    expect(json.code).toBe("context_mismatch");
  });

  it("rejects missing ledger row", async () => {
    const token = await signedBrowseToken();
    mockGetLedger.mockResolvedValue(null);
    const res = await POST(verifyRequest({
      browse_receipt: token,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    const json = await res.json() as { verified?: boolean; code?: string };
    expect(res.status).toBe(400);
    expect(json.verified).toBe(false);
    expect(json.code).toBe("attestation_inactive");
  });

  it("rejects missing required params", async () => {
    const res = await POST(verifyRequest({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }));
    expect(res.status).toBe(400);
  });
});
