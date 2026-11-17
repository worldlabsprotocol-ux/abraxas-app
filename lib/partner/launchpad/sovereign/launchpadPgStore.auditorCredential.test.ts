// FILE: lib/partner/launchpad/sovereign/launchpadPgStore.auditorCredential.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/pgPool", () => ({
  queryAbraxasPg: (...args: unknown[]) => queryMock(...args),
}));

import { pgResolvePartnerApiKeyForAuditorCredential } from "./launchpadPgStore";

const KEY_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d968";

describe("pgResolvePartnerApiKeyForAuditorCredential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active when key exists, matches partner, and is not revoked", async () => {
    queryMock.mockResolvedValue({
      rows: [{ partner_id: "acme", revoked_at: null }],
    });
    const result = await pgResolvePartnerApiKeyForAuditorCredential({
      keyId: KEY_ID,
      expectedPartnerId: "acme",
    });
    expect(result).toEqual({ ok: true, disposition: "active" });
  });

  it("returns missing when no row exists", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const result = await pgResolvePartnerApiKeyForAuditorCredential({
      keyId: KEY_ID,
      expectedPartnerId: "acme",
    });
    expect(result).toEqual({ ok: false, disposition: "missing" });
  });

  it("returns revoked when revoked_at is set", async () => {
    queryMock.mockResolvedValue({
      rows: [{ partner_id: "acme", revoked_at: "2026-01-01T00:00:00.000Z" }],
    });
    const result = await pgResolvePartnerApiKeyForAuditorCredential({
      keyId: KEY_ID,
      expectedPartnerId: "acme",
    });
    expect(result).toEqual({ ok: false, disposition: "revoked" });
  });

  it("returns partner_mismatch when partner_id does not match session", async () => {
    queryMock.mockResolvedValue({
      rows: [{ partner_id: "other", revoked_at: null }],
    });
    const result = await pgResolvePartnerApiKeyForAuditorCredential({
      keyId: KEY_ID,
      expectedPartnerId: "acme",
    });
    expect(result).toEqual({ ok: false, disposition: "partner_mismatch" });
  });

  it("returns unavailable on database errors", async () => {
    queryMock.mockRejectedValue(new Error("connection refused"));
    const result = await pgResolvePartnerApiKeyForAuditorCredential({
      keyId: KEY_ID,
      expectedPartnerId: "acme",
    });
    expect(result).toEqual({ ok: false, disposition: "unavailable" });
  });
});