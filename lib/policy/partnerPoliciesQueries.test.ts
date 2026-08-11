import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const orderMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: fromMock }),
}));

import { listPolicyVersions } from "@/lib/policy/policyVersioning";

describe("partner_policies query safety after multi-version PK (P1-1)", () => {
  const getPolicySource = readFileSync(
    resolve(process.cwd(), "lib/policy/getPolicy.ts"),
    "utf8",
  );
  const preflightSource = readFileSync(
    resolve(process.cwd(), "scripts/integration-preflight.ts"),
    "utf8",
  );
  const versioningSource = readFileSync(
    resolve(process.cwd(), "lib/policy/policyVersioning.ts"),
    "utf8",
  );

  it("getPartnerPolicy filters active status before maybeSingle", () => {
    expect(getPolicySource).toMatch(/\.eq\("status", "active"\)/);
    expect(getPolicySource).toMatch(/maybeSingle\(\)/);
  });

  it("getPartnerPolicyAtVersion filters exact version before maybeSingle", () => {
    expect(getPolicySource).toMatch(/\.eq\("version", version\)/);
  });

  it("integration preflight loadPolicy filters active status", () => {
    expect(preflightSource).toMatch(/from\("partner_policies"\)/);
    expect(preflightSource).toMatch(/\.eq\("status", "active"\)/);
    expect(preflightSource).toMatch(/maybeSingle\(\)/);
  });

  it("publishPolicyDraft uses atomic RPC instead of two-step updates", () => {
    expect(versioningSource).toContain('rpc("publish_partner_policy_draft"');
    expect(versioningSource).not.toMatch(/deprecateError/);
  });

  describe("listPolicyVersions behavior", () => {
    const POLICY_ID = "partner-sandbox-gate-v1";
    const versionRow = (version: number, status: string) => ({
      id: POLICY_ID,
      version,
      status,
      name: `Policy v${version}`,
      partner_id: "abraxas-partner-sandbox",
      effective_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    beforeEach(() => {
      vi.clearAllMocks();
      orderMock.mockResolvedValue({ data: [], error: null });
      eqMock.mockReturnValue({ order: orderMock });
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      });
    });

    it("returns multiple versions for a policy id", async () => {
      orderMock.mockResolvedValue({
        data: [versionRow(1, "deprecated"), versionRow(2, "active")],
        error: null,
      });

      const versions = await listPolicyVersions(POLICY_ID);

      expect(fromMock).toHaveBeenCalledWith("partner_policies");
      expect(eqMock).toHaveBeenCalledWith("id", POLICY_ID);
      expect(orderMock).toHaveBeenCalledWith("version", { ascending: true });
      expect(versions).toHaveLength(2);
      expect(versions.map(v => v.version)).toEqual([1, 2]);
    });

    it("returns one version", async () => {
      orderMock.mockResolvedValue({
        data: [versionRow(1, "active")],
        error: null,
      });

      const versions = await listPolicyVersions(POLICY_ID);

      expect(versions).toHaveLength(1);
      expect(versions[0]?.status).toBe("active");
    });

    it("returns an empty array when no versions exist", async () => {
      orderMock.mockResolvedValue({ data: [], error: null });

      const versions = await listPolicyVersions(POLICY_ID);

      expect(versions).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      orderMock.mockResolvedValue({ data: null, error: { message: "db unavailable" } });

      await expect(listPolicyVersions(POLICY_ID)).rejects.toThrow("db unavailable");
    });
  });
});
