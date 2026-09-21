import { keccak256 } from "viem";
import type { OnchainGateSafeReason } from "./contract";
import type { EvmDeploymentManifest, SolanaDeploymentManifest } from "./types";

export interface EvmChainObservation {
  codeHash: `0x${string}`;
  configDigest: `0x${string}`;
}

export interface SolanaChainObservation {
  programId: string;
  gateConfigPda: string;
  programDigest: `0x${string}`;
  configDigest: `0x${string}`;
  canonicalMessageLen?: number;
  schemaVersion?: number;
  requireInstitutional?: boolean;
  institutionalCapable?: boolean;
}

export interface EvmVerificationAdapter {
  kind: "server_rpc" | "local_anvil_fixture";
  observe(manifest: EvmDeploymentManifest): Promise<EvmChainObservation | { unavailable: true }>;
}

export interface SolanaVerificationAdapter {
  kind: "server_rpc" | "local_program_test_fixture";
  observe(manifest: SolanaDeploymentManifest): Promise<SolanaChainObservation | { unavailable: true }>;
}

const evmFixtures = new Map<string, EvmChainObservation>();
const solanaFixtures = new Map<string, SolanaChainObservation>();

export function resetOnchainVerificationFixtures(): void {
  evmFixtures.clear();
  solanaFixtures.clear();
}

export function setLocalAnvilFixture(address: string, observation: EvmChainObservation): void {
  evmFixtures.set(address.toLowerCase(), observation);
}

export function setLocalSolanaProgramTestFixture(programId: string, pda: string, observation: SolanaChainObservation): void {
  solanaFixtures.set(`${programId}:${pda}`, observation);
}

export function localAnvilFixtureAdapter(): EvmVerificationAdapter {
  return {
    kind: "local_anvil_fixture",
    async observe(manifest) {
      const row = evmFixtures.get(manifest.gate_address.toLowerCase());
      if (!row) return { unavailable: true };
      return row;
    },
  };
}

export function localSolanaProgramTestAdapter(): SolanaVerificationAdapter {
  return {
    kind: "local_program_test_fixture",
    async observe(manifest) {
      const row = solanaFixtures.get(`${manifest.program_id}:${manifest.gate_config_pda}`);
      if (!row) return { unavailable: true };
      return row;
    },
  };
}

function localRpcHostname(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

async function jsonRpc(url: string, method: string, params: unknown[]): Promise<unknown | null> {
  if (process.env.NODE_ENV === "test" && !localRpcHostname(url)) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { result?: unknown };
  return json.result ?? null;
}

export function serverEvmRpcAdapter(): EvmVerificationAdapter | null {
  const url = process.env.ABRAXAS_EVM_GATE_VERIFY_RPC_URL?.trim() ?? "";
  if (!url) return null;
  return {
    kind: "server_rpc",
    async observe(manifest) {
      try {
        const code = await jsonRpc(url, "eth_getCode", [manifest.gate_address, "latest"]);
        if (typeof code !== "string" || code === "0x" || code === "0x0") return { unavailable: true };
        const digestCall = await jsonRpc(url, "eth_call", [
          { to: manifest.gate_address, data: "0x0c53c51c" },
          "latest",
        ]);
        if (typeof digestCall !== "string" || !/^0x[0-9a-fA-F]{64,}$/.test(digestCall)) return { unavailable: true };
        return {
          codeHash: keccak256(code as `0x${string}`),
          configDigest: (`0x${digestCall.replace(/^0x/, "").slice(-64).toLowerCase()}`) as `0x${string}`,
        };
      } catch {
        return { unavailable: true };
      }
    },
  };
}

export function serverSolanaRpcAdapter(): SolanaVerificationAdapter | null {
  const url = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() ?? "";
  if (!url) return null;
  return {
    kind: "server_rpc",
    async observe(manifest) {
      try {
        const account = await jsonRpc(url, "getAccountInfo", [
          manifest.gate_config_pda,
          { encoding: "base64" },
        ]);
        if (!account || typeof account !== "object") return { unavailable: true };
        const info = account as { value?: { owner?: string; data?: [string, string] } | null };
        if (!info.value?.owner || !info.value.data?.[0]) return { unavailable: true };
        if (info.value.owner !== manifest.program_id) return { unavailable: true };
        const raw = Buffer.from(info.value.data[0], "base64");
        const digest = keccak256(`0x${raw.toString("hex")}` as `0x${string}`);
        return {
          programId: info.value.owner,
          gateConfigPda: manifest.gate_config_pda,
          programDigest: digest,
          configDigest: digest,
        };
      } catch {
        return { unavailable: true };
      }
    },
  };
}

export function resolveEvmAdapter(override?: EvmVerificationAdapter | null): EvmVerificationAdapter | null {
  if (override) return override;
  if (process.env.NODE_ENV === "test") return localAnvilFixtureAdapter();
  return serverEvmRpcAdapter();
}

export function resolveSolanaAdapter(override?: SolanaVerificationAdapter | null): SolanaVerificationAdapter | null {
  if (override) return override;
  if (process.env.NODE_ENV === "test") return localSolanaProgramTestAdapter();
  return serverSolanaRpcAdapter();
}

export async function verifyEvmAgainstChain(
  manifest: EvmDeploymentManifest,
  adapter: EvmVerificationAdapter | null,
): Promise<{ ok: true } | { ok: false; reason: OnchainGateSafeReason }> {
  if (!adapter) return { ok: false, reason: "deployment_verification_unavailable" };
  const observed = await adapter.observe(manifest);
  if ("unavailable" in observed) return { ok: false, reason: "deployment_verification_unavailable" };
  if (observed.codeHash.toLowerCase() !== manifest.bytecode_hash.toLowerCase()) {
    return { ok: false, reason: "code_hash_mismatch" };
  }
  if (observed.configDigest.toLowerCase() !== manifest.config_digest.toLowerCase()) {
    return { ok: false, reason: "config_digest_mismatch" };
  }
  return { ok: true };
}

export function solanaObservationIsV1Only(observed: SolanaChainObservation): boolean {
  return observed.institutionalCapable === false
    || observed.requireInstitutional === false
    || observed.schemaVersion === 1
    || observed.canonicalMessageLen === 372;
}

export function solanaObservationHasV2InstitutionalCapability(observed: SolanaChainObservation): boolean {
  return observed.institutionalCapable === true
    && observed.requireInstitutional === true
    && observed.schemaVersion === 2
    && observed.canonicalMessageLen === 468;
}

export async function verifySolanaAgainstChain(
  manifest: SolanaDeploymentManifest,
  adapter: SolanaVerificationAdapter | null,
  options?: { institutionalRequired?: boolean },
): Promise<{ ok: true } | { ok: false; reason: OnchainGateSafeReason }> {
  if (!adapter) return { ok: false, reason: "deployment_verification_unavailable" };
  const observed = await adapter.observe(manifest);
  if ("unavailable" in observed) return { ok: false, reason: "deployment_verification_unavailable" };
  if (observed.programId !== manifest.program_id) return { ok: false, reason: "program_mismatch" };
  if (observed.gateConfigPda !== manifest.gate_config_pda) return { ok: false, reason: "gate_config_mismatch" };
  if (observed.programDigest.toLowerCase() !== manifest.program_digest.toLowerCase()) {
    return { ok: false, reason: "program_mismatch" };
  }
  if (observed.configDigest.toLowerCase() !== manifest.config_digest.toLowerCase()) {
    return { ok: false, reason: "config_digest_mismatch" };
  }
  if (options?.institutionalRequired) {
    if (solanaObservationIsV1Only(observed) || !solanaObservationHasV2InstitutionalCapability(observed)) {
      return { ok: false, reason: "institutional_required" };
    }
  }
  return { ok: true };
}
