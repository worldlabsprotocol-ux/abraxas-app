// FILE: lib/developers/integrationStudioWalletSurface.ts
// Integration Studio wallet UI — reuse ephemeral sandbox proof; avoid redundant connection steps.

import type { WalletStandardBindView } from "@/lib/partner/walletStandard/contract";
import type { EvmWalletBindView } from "@/lib/partner/evmWalletBinding/contract";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { sandboxPolicyToStudioPack } from "@/lib/developers/sandboxIntegrationHandoff";
import type { ServerAuthoritativeJourneySnapshot } from "@/lib/developers/serverAuthoritativeJourney";

export type IntegrationStudioSolanaSurfaceMode =
  | "verified_compact"
  | "connect_required"
  | "action_required";

export type IntegrationStudioSolanaSurface = {
  mode: IntegrationStudioSolanaSurfaceMode;
  wallet_address: string | null;
  proof_source: "studio_wallet_standard_binding" | "ephemeral_sandbox_receipt" | null;
  studio_binding: WalletStandardBindView;
  reuse_eligible: boolean;
  require_signature_reason: string | null;
  verified_detail: string;
};

export type IntegrationStudioWalletSurfaceResponse = {
  solana: IntegrationStudioSolanaSurface;
  evm: EvmWalletBindView;
  show_evm_options: boolean;
  ephemeral_authenticated: boolean;
};

const EVM_FORWARD_PATHS = new Set<IntegrationStudioPathId>([
  "evm_partner_adapter",
  "evm_onchain_eligibility_gate",
  "cross_chain_protocol_access",
  "onchain_protocol_gate",
]);

export function integrationStudioPathOffersEvm(pathId: IntegrationStudioPathId): boolean {
  return EVM_FORWARD_PATHS.has(pathId);
}

function proofPolicyPack(proofPolicyId: string): string | null {
  const direct = sandboxPolicyToStudioPack(proofPolicyId);
  if (direct) return direct;
  return inferPolicyPackFromPolicyId(proofPolicyId)?.id ?? null;
}

function applicationPolicyAlignsWithProof(applicationPolicyId: string, proofPolicyId: string): boolean {
  const appPack = inferPolicyPackFromPolicyId(applicationPolicyId)?.id ?? null;
  const proofPack = proofPolicyPack(proofPolicyId);
  if (!appPack || !proofPack) return false;
  return appPack === proofPack;
}

export function resolveIntegrationStudioSolanaSurface(input: {
  studioBinding: WalletStandardBindView;
  journey: ServerAuthoritativeJourneySnapshot | null;
  ephemeralAuthenticated: boolean;
  ephemeralWalletAddress: string | null;
  applicationPolicyId: string;
}): IntegrationStudioSolanaSurface {
  const studioOk = input.studioBinding.ok === true;
  const journeyValidated = input.journey?.wallet_proof_validated === true;
  const policyAligned =
    journeyValidated
    && input.journey?.policy_id
    && applicationPolicyAlignsWithProof(input.applicationPolicyId, input.journey.policy_id);

  const sessionReady = input.ephemeralAuthenticated && Boolean(input.ephemeralWalletAddress?.trim());
  const reuseEligible = studioOk || (journeyValidated && policyAligned && sessionReady);

  if (studioOk) {
    return {
      mode: "verified_compact",
      wallet_address: input.ephemeralWalletAddress,
      proof_source: "studio_wallet_standard_binding",
      studio_binding: input.studioBinding,
      reuse_eligible: true,
      require_signature_reason: null,
      verified_detail: "Your connected wallet is ready for this test.",
    };
  }

  if (journeyValidated && policyAligned && sessionReady) {
    return {
      mode: "verified_compact",
      wallet_address: input.ephemeralWalletAddress,
      proof_source: "ephemeral_sandbox_receipt",
      studio_binding: input.studioBinding,
      reuse_eligible: true,
      require_signature_reason: null,
      verified_detail: "Your connected wallet is ready for this test.",
    };
  }

  if (journeyValidated && sessionReady && !policyAligned) {
    return {
      mode: "action_required",
      wallet_address: input.ephemeralWalletAddress,
      proof_source: null,
      studio_binding: input.studioBinding,
      reuse_eligible: false,
      require_signature_reason:
        "Your earlier wallet proof applies to a different policy pack than this sandbox application. Connect again only if this integration requires wallet control under the new policy.",
      verified_detail: "",
    };
  }

  if (input.journey && !journeyValidated) {
    const bindingStale =
      input.studioBinding.status === "expired"
      || input.studioBinding.status === "revoked"
      || input.studioBinding.status === "replayed";
    const reason = bindingStale
      ? "The previous wallet binding is no longer valid."
      : "Your earlier wallet proof is expired or no longer acceptable. A fresh wallet authorization is required for the next protected action.";
    return {
      mode: "connect_required",
      wallet_address: input.ephemeralWalletAddress,
      proof_source: null,
      studio_binding: input.studioBinding,
      reuse_eligible: false,
      require_signature_reason: reason,
      verified_detail: "",
    };
  }

  if (!sessionReady) {
    return {
      mode: "connect_required",
      wallet_address: null,
      proof_source: null,
      studio_binding: input.studioBinding,
      reuse_eligible: false,
      require_signature_reason: null,
      verified_detail: "",
    };
  }

  return {
    mode: "connect_required",
    wallet_address: input.ephemeralWalletAddress,
    proof_source: null,
    studio_binding: input.studioBinding,
    reuse_eligible: false,
    require_signature_reason: null,
    verified_detail: "",
  };
}

export function buildIntegrationStudioWalletSurface(input: {
  studioBindings: { solana: WalletStandardBindView; evm: EvmWalletBindView };
  journey: ServerAuthoritativeJourneySnapshot | null;
  ephemeralAuthenticated: boolean;
  ephemeralWalletAddress: string | null;
  applicationPolicyId: string;
  pathId: IntegrationStudioPathId;
}): IntegrationStudioWalletSurfaceResponse {
  const solana = resolveIntegrationStudioSolanaSurface({
    studioBinding: input.studioBindings.solana,
    journey: input.journey,
    ephemeralAuthenticated: input.ephemeralAuthenticated,
    ephemeralWalletAddress: input.ephemeralWalletAddress,
    applicationPolicyId: input.applicationPolicyId,
  });
  return {
    solana,
    evm: input.studioBindings.evm,
    show_evm_options: integrationStudioPathOffersEvm(input.pathId) || input.studioBindings.evm.ok === true,
    ephemeral_authenticated: input.ephemeralAuthenticated,
  };
}

export function formatStudioVerifiedWalletLabel(
  walletAddress: string | null,
  adapterName?: string | null,
): string {
  if (adapterName?.trim()) {
    return `${adapterName.trim()} · Solana`;
  }
  if (walletAddress?.trim()) {
    const w = walletAddress.trim();
    const short = w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
    return `Solana · ${short}`;
  }
  return "Solana wallet";
}
