import { parseOnchainDeploymentManifest, onchainGatePayloadLeaks } from "@/lib/partner/onchainGateDeployments/parseManifest";
import {
  resolveEvmAdapter,
  resolveSolanaAdapter,
  verifyEvmAgainstChain,
  verifySolanaAgainstChain,
} from "@/lib/partner/onchainGateDeployments/adapters";
import { evmDigestFromManifest, solanaDigestFromManifest } from "@/lib/partner/onchainGateDeployments/digests";
import { hashEnvironment } from "@/lib/partner/chainAttestation/hashes";
import { rejectForbiddenNetwork } from "./networks";
import type { TestnetGateKitEnvelope } from "./types";
import type { OnchainDeploymentManifest } from "@/lib/partner/onchainGateDeployments/types";

export function extractRegistryManifest(raw: unknown): OnchainDeploymentManifest | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "registry_manifest" in raw) {
    const envelope = raw as TestnetGateKitEnvelope;
    return envelope.registry_manifest;
  }
  const parsed = parseOnchainDeploymentManifest(raw);
  return parsed.ok ? parsed.manifest : null;
}

export async function verifyTestnetManifest(raw: unknown): Promise<
  { ok: true; manifest: OnchainDeploymentManifest } | { ok: false; reason: string }
> {
  if (onchainGatePayloadLeaks(raw).length) return { ok: false, reason: "forbidden_field" };
  const manifest = extractRegistryManifest(raw);
  if (!manifest) return { ok: false, reason: "unverified_manifest" };
  const parsed = parseOnchainDeploymentManifest(manifest);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const forbidden = rejectForbiddenNetwork(parsed.manifest.network_id);
  if (forbidden) return { ok: false, reason: forbidden };
  const envHash = hashEnvironment(parsed.manifest.environment);
  const digest = parsed.manifest.gate_type === "evm"
    ? evmDigestFromManifest(parsed.manifest, envHash)
    : solanaDigestFromManifest(parsed.manifest, envHash);
  if (digest !== parsed.manifest.config_digest) return { ok: false, reason: "config_digest_mismatch" };
  if (parsed.manifest.gate_type === "evm") {
    const verified = await verifyEvmAgainstChain(parsed.manifest, resolveEvmAdapter());
    if (!verified.ok) return verified;
  } else {
    const verified = await verifySolanaAgainstChain(parsed.manifest, resolveSolanaAdapter());
    if (!verified.ok) return verified;
  }
  return { ok: true, manifest: parsed.manifest };
}
