// FILE: lib/passport/portableTrust/portableTrust.security.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const VICTIM_SUI = "0x0000000000000000000000000000000000000000000000000000000000000001";
const ATTACKER_HOLDER = "abx_hs_aabbccddeeff00112233445566778899";
const VICTIM_HOLDER = "abx_hs_00112233445566778899aabbccddeeff00";

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(),
}));

vi.mock("@/lib/passport/portableTrust/holderReceiptAccess", () => ({
  listHolderPortableCredentials: vi.fn(async () => []),
  getHolderReceiptIfOwned: vi.fn(async () => null),
}));

import { requireBrowserSession } from "@/lib/auth/browserSession";
import { listHolderPortableCredentials, getHolderReceiptIfOwned } from "@/lib/passport/portableTrust/holderReceiptAccess";
import { GET as credentialsGET } from "@/app/api/passport/portable-trust/credentials/route";
import { POST as exportPOST } from "@/app/api/passport/portable-trust/export/route";
import { POST as importPOST } from "@/app/api/passport/portable-trust/import/route";
import { POST as independentVerifyPOST } from "@/app/api/passport/portable-trust/independent-verify/route";
import { assertSessionBindingConsistent } from "@/lib/passport/portableTrust/resolveHolderSession";
import { build546SampleRecord } from "@/lib/institutionalCertification/build546/fixtures";
import { buildHolderPortableExport } from "@/lib/passport/portableTrust/presentationBundle";

const requireBrowserSessionMock = vi.mocked(requireBrowserSession);

function sessionFor(subjectId: string, extra?: { suiAddress?: string; holderSubjectId?: string }) {
  return {
    ok: true as const,
    session: {
      subjectId,
      holderSubjectId: extra?.holderSubjectId ?? (subjectId.startsWith("abx_hs_") ? subjectId : undefined),
      suiAddress: extra?.suiAddress,
      authMethod: "oauth" as const,
    },
  };
}

describe("Build #565 portable trust security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.VERCEL_ENV;
    delete process.env.ABRAXAS_PORTABLE_TRUST_SYNTHETIC_VERIFY;
  });

  it("rejects unauthenticated ?sui= wallet enumeration for credentials", async () => {
    requireBrowserSessionMock.mockResolvedValue({ ok: false, error: "Sign in required", status: 401 });
    const res = await credentialsGET(
      new NextRequest(`http://localhost/api/passport/portable-trust/credentials?sui=${VICTIM_SUI}`),
    );
    expect(res.status).toBe(403);
    expect(listHolderPortableCredentials).not.toHaveBeenCalled();
  });

  it("rejects authenticated attacker with victim ?sui= query", async () => {
    requireBrowserSessionMock.mockResolvedValue(sessionFor(ATTACKER_HOLDER));
    const res = await credentialsGET(
      new NextRequest(`http://localhost/api/passport/portable-trust/credentials?sui=${VICTIM_SUI}`),
    );
    expect(res.status).toBe(403);
    expect(listHolderPortableCredentials).not.toHaveBeenCalled();
  });

  it("lists credentials only for authenticated session subject (chain-neutral)", async () => {
    requireBrowserSessionMock.mockResolvedValue(sessionFor(VICTIM_HOLDER));
    const res = await credentialsGET(new NextRequest("http://localhost/api/passport/portable-trust/credentials"));
    expect(res.status).toBe(200);
    expect(listHolderPortableCredentials).toHaveBeenCalledWith({ subjectId: VICTIM_HOLDER });
  });

  it("export requires same-origin and verified ownership", async () => {
    requireBrowserSessionMock.mockResolvedValue(sessionFor(ATTACKER_HOLDER));
    const noOrigin = await exportPOST(
      new NextRequest("http://localhost/api/passport/portable-trust/export", {
        method: "POST",
        body: JSON.stringify({ receipt_id: "dr_victim" }),
      }),
    );
    expect(noOrigin.status).toBe(403);

    const crossOrigin = await exportPOST(
      new NextRequest("http://localhost/api/passport/portable-trust/export", {
        method: "POST",
        headers: { origin: "https://evil.example", "content-type": "application/json" },
        body: JSON.stringify({ receipt_id: "dr_victim" }),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const owned = await exportPOST(
      new NextRequest("http://localhost/api/passport/portable-trust/export", {
        method: "POST",
        headers: { origin: "http://localhost", "content-type": "application/json" },
        body: JSON.stringify({ receipt_id: "dr_victim" }),
      }),
    );
    expect(owned.status).toBe(404);
    expect(getHolderReceiptIfOwned).toHaveBeenCalledWith({
      subjectId: ATTACKER_HOLDER,
      receiptId: "dr_victim",
    });
  });

  it("import reports structural validation only — not trust verified", async () => {
    const signed = build546SampleRecord(undefined, { id: "dr_struct" });
    const exported = buildHolderPortableExport({ record: signed });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const res = await importPOST(
      new NextRequest("http://localhost/api/passport/portable-trust/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(exported.bundle),
      }),
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.structural_validation).toBe("passed");
    expect(body.trust_verification).toBe("not_performed");
    expect(body).not.toHaveProperty("valid", true);
  });

  it("independent-verify fails closed in production environment", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    const signed = build546SampleRecord(undefined, { id: "dr_prod_block" });
    const exported = buildHolderPortableExport({ record: signed });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const res = await independentVerifyPOST(
      new NextRequest("http://localhost/api/passport/portable-trust/independent-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bundle: exported.bundle }),
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("synthetic_verification_disabled_in_production");
  });

  it("assertSessionBindingConsistent accepts chain-neutral and legacy Sui sessions", () => {
    expect(
      assertSessionBindingConsistent({
        subjectId: VICTIM_HOLDER,
        holderSubjectId: VICTIM_HOLDER,
        authMethod: "evm_wallet",
      }),
    ).toBe(true);
    expect(
      assertSessionBindingConsistent({
        subjectId: VICTIM_SUI,
        suiAddress: VICTIM_SUI,
        authMethod: "oauth",
      }),
    ).toBe(true);
    expect(
      assertSessionBindingConsistent({
        subjectId: VICTIM_HOLDER,
        suiAddress: VICTIM_SUI,
        authMethod: "oauth",
      }),
    ).toBe(false);
  });
});
