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
import {
  institutionalConfigDigest,
  institutionalEnvelopeLeaks,
} from "./institutional";
import type { InstitutionalKitPlan, TestnetGateKitEnvelope } from "./types";
import type { OnchainDeploymentManifest } from "@/lib/partner/onchainGateDeployments/types";

export function extractRegistryManifest(raw: unknown): OnchainDeploymentManifest | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "registry_manifest" in raw) {
    const envelope = raw as TestnetGateKitEnvelope;
    return envelope.registry_manifest;
  }
  const parsed = parseOnchainDeploymentManifest(raw);
  return parsed.ok ? parsed.manifest : null;
}

function institutionalPlanFrom(raw: unknown): InstitutionalKitPlan | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as TestnetGateKitEnvelope;
  return rec.institutional ?? null;
}

export function verifyInstitutionalPlan(
  plan: InstitutionalKitPlan,
  envelope?: TestnetGateKitEnvelope | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): { ok: true } | { ok: false; reason: string } {
  void nowSeconds;
  if (plan.schema_version !== "2") return { ok: false, reason: "schema_mismatch" };
  if (!plan.institutional_required || plan.require_institutional !== true) {
    return { ok: false, reason: "institutional_required" };
  }
  const leftover = plan as InstitutionalKitPlan & {
    organization_commitment?: unknown;
    actor_commitment?: unknown;
    institutional_result_category_hash?: unknown;
    valid_until?: unknown;
  };
  if (
    leftover.organization_commitment != null
    || leftover.actor_commitment != null
    || leftover.institutional_result_category_hash != null
    || leftover.valid_until != null
  ) {
    return { ok: false, reason: "binding_mismatch" };
  }
  if (envelope?.eip712 && envelope.eip712.version !== "2") return { ok: false, reason: "schema_mismatch" };
  if (envelope && envelope.bindings.signer_key_id !== plan.signer_key_id) {
    return { ok: false, reason: "signer_mismatch" };
  }
  if (envelope && (
    envelope.partner_hash !== plan.partner_hash
    || envelope.policy_hash !== plan.policy_hash
    || envelope.action_hash !== plan.action_hash
  )) {
    return { ok: false, reason: "binding_mismatch" };
  }
  const expected = institutionalConfigDigest({
    gateType: envelope?.gate_type ?? "evm",
    networkId: envelope?.network_id ?? "evm_sepolia",
    chainId: envelope?.chain_id ?? null,
    partnerHash: plan.partner_hash,
    policyHash: plan.policy_hash,
    actionHash: plan.action_hash,
    environmentHash: plan.environment_hash,
    signerKeyId: plan.signer_key_id,
    publicVerifier: plan.public_verifier,
  });
  if (expected !== plan.config_digest) return { ok: false, reason: "config_digest_mismatch" };
  if (envelope?.solana_v2 && (
    envelope.solana_v2.message_len !== 468
    || envelope.solana_v2.schema_version !== 2
    || envelope.solana_v2.prefix !== "ABRAXAS_CHAIN_ELIGIBILITY_V2"
    || envelope.solana_v2.require_institutional !== true
    || envelope.solana_v2.institutional_capable !== true
  )) {
    return { ok: false, reason: "institutional_required" };
  }
  return { ok: true };
}

export async function verifyTestnetManifest(raw: unknown): Promise<
  { ok: true; manifest: OnchainDeploymentManifest } | { ok: false; reason: string }
> {
  if (onchainGatePayloadLeaks(raw).length || institutionalEnvelopeLeaks(raw).length) {
    return { ok: false, reason: "forbidden_field" };
  }
  const envelope = raw && typeof raw === "object" && "institutional" in (raw as object)
    ? raw as TestnetGateKitEnvelope
    : null;
  if (envelope?.institutional) {
    const institutional = verifyInstitutionalPlan(envelope.institutional, envelope);
    if (!institutional.ok) return institutional;
  }
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
    if (envelope?.institutional?.institutional_required) {
      const { deriveRequireInstitutional } = await import("@/lib/partner/onchainGateDeployments/institutional");
      const derived = deriveRequireInstitutional({
        gateType: "solana",
        policyId: envelope.bindings?.policy_id ?? "",
        solanaObservation: verified.observation,
      });
      if (!derived.ok || !derived.require_institutional) return { ok: false, reason: "institutional_required" };
    }
  }
  return { ok: true, manifest: parsed.manifest };
}
