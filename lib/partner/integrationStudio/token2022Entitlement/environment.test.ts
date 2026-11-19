import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveToken2022StudioEnvironment } from "./environment";

describe("resolveToken2022StudioEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks production surfaces", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const env = await resolveToken2022StudioEnvironment();
    expect(env.kind).toBe("production_unavailable");
    expect(env.mint_and_consume_actionable).toBe(false);
  });

  it("labels missing RPC as local ProgramTest reference", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("ABRAXAS_PROOF_CONTINUITY_RPC_URL", "");
    const env = await resolveToken2022StudioEnvironment();
    expect(env.kind).toBe("local_program_test_reference");
    expect(env.mint_and_consume_actionable).toBe(false);
  });
});