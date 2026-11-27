import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const reference = "https://github.com/worldlabsprotocol-ux/abraxas-app/pull/1003#issuecomment-1234567890";
afterEach(() => vi.unstubAllEnvs());

describe("Proof Continuity upgrade gate", () => {
  it("stays disabled in Production even with copied approval variables", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_ENABLED", "true");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000000");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE", reference);
    expect((await GET().json()).enabled).toBe(false);
  });

  it("requires a fresh approval reference and exact cap in Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_ENABLED", "true");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000000");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE",
      "https://github.com/worldlabsprotocol-ux/abraxas-app/pull/1001#issuecomment-7203755892");
    expect((await GET().json()).enabled).toBe(false);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE", reference);
    expect((await GET().json()).enabled).toBe(true);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000001");
    expect((await GET().json()).enabled).toBe(false);
  });
});
