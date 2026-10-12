import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildTrustRegistryCustodyStatusResponse } from "@/lib/solana/trustRegistry/governance/buildTrustRegistryCustodyStatusResponse";
import {
  fetchSolanaAccountInfo,
  fetchSolanaGenesisHash,
  fetchSolanaSlot,
} from "@/lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc";

vi.mock("@/lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc")
  >();
  return {
    ...actual,
    fetchSolanaGenesisHash: vi.fn(),
    fetchSolanaSlot: vi.fn(),
    fetchSolanaAccountInfo: vi.fn(),
  };
});

const mockedGenesis = vi.mocked(fetchSolanaGenesisHash);
const mockedSlot = vi.mocked(fetchSolanaSlot);
const mockedAccount = vi.mocked(fetchSolanaAccountInfo);

const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

function okAccount(partial?: Partial<{ executable: boolean; owner: string; data: Buffer }>) {
  return {
    ok: true as const,
    value: {
      owner: partial?.owner ?? "11111111111111111111111111111111",
      executable: partial?.executable ?? false,
      lamports: 1,
      data: partial?.data ?? Buffer.alloc(0),
    },
  };
}

describe("buildTrustRegistryCustodyStatusResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGenesis.mockResolvedValue({ ok: true, value: DEVNET_GENESIS });
    mockedSlot.mockResolvedValue({ ok: true, value: 123 });
    mockedAccount.mockResolvedValue({ ok: true, value: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns contract JSON with schema on successful chain reads (degraded gate expected without full fixtures)", async () => {
    mockedAccount.mockResolvedValue({ ok: true, value: null });

    const res = await buildTrustRegistryCustodyStatusResponse({
      SOLANA_DEVNET_RPC_URL: "https://example-devnet.test",
    });
    const json = await res.json();
    expect(res.status).toBeLessThan(600);
    expect(json.schema).toBe("trust_registry_custody_status_v539");
    expect(json.liveControlsEnabled).toBe(false);
    expect(json.gate?.schema).toBe("trust_registry_governance_activation_gate_v539");
    expect(json.authority_separation).toBeDefined();
    expect(json.operational_status).not.toBe("internal_error");
  });

  it("returns 503 rpc_unavailable when RPC meta cannot be read", async () => {
    mockedGenesis.mockResolvedValue({ ok: false, code: "rpc_timeout", detail: "timeout" });
    mockedSlot.mockResolvedValue({ ok: false, code: "rpc_timeout", detail: "timeout" });

    const res = await buildTrustRegistryCustodyStatusResponse({
      SOLANA_DEVNET_RPC_URL: "https://example-devnet.test",
    });
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.schema).toBe("trust_registry_custody_status_v539");
    expect(json.operational_status).toBe("rpc_unavailable");
    expect(json.rpc_evidence?.reachable).toBe(false);
  });

  it("handles missing multisig env configuration without claiming live custody", async () => {
    vi.stubEnv("INSTITUTIONAL_PROTOCOL_UPGRADE_MULTISIG_PDA", "");
    vi.stubEnv("INSTITUTIONAL_REGISTRY_ADMIN_MULTISIG_PDA", "");

    const res = await buildTrustRegistryCustodyStatusResponse({
      SOLANA_DEVNET_RPC_URL: "https://example-devnet.test",
    });
    const json = await res.json();
    expect(json.schema).toBe("trust_registry_custody_status_v539");
    expect(json.custody?.envConfigured).toBe(false);
    expect(json.authority_separation?.live_multisig_observation).toBe(false);
    expect(json.gate?.liveControlsEnabled).toBeUndefined();
    expect(json.liveControlsEnabled).toBe(false);
  });

  it("surfaces malformed RPC account responses as observation errors, not HTML", async () => {
    mockedAccount.mockResolvedValue({
      ok: false,
      code: "rpc_malformed_response",
      detail: "account_info_shape",
    });

    const res = await buildTrustRegistryCustodyStatusResponse({
      SOLANA_DEVNET_RPC_URL: "https://example-devnet.test",
    });
    const json = await res.json();
    expect(res.headers.get("content-type")?.includes("application/json")).toBe(true);
    expect(json.schema).toBe("trust_registry_custody_status_v539");
    expect(json.rpc_evidence?.failures.length).toBeGreaterThan(0);
  });
});
