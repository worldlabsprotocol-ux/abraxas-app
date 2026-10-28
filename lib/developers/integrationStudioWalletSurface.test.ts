import { describe, expect, it } from "vitest";
import {
  buildIntegrationStudioWalletSurface,
  resolveIntegrationStudioSolanaSurface,
} from "@/lib/developers/integrationStudioWalletSurface";
import type { ServerAuthoritativeJourneySnapshot } from "@/lib/developers/serverAuthoritativeJourney";

const journeyValidated: ServerAuthoritativeJourneySnapshot = {
  policy_id: "wallet_control",
  studio_pack_id: "wallet_control",
  decision: "approved",
  receipt_id: "rcpt_1",
  wallet_proof_validated: true,
  workflow_phase: "integration_ready",
  policy_locked: true,
  policy_lock_reasons: [],
};

const notAttached = { ok: false as const, status: "not_attached" as const, binding_ref: null, expires_at: null };

describe("integrationStudioWalletSurface", () => {
  it("reuses validated ephemeral sandbox proof instead of studio binding", () => {
    const solana = resolveIntegrationStudioSolanaSurface({
      studioBinding: notAttached,
      journey: journeyValidated,
      ephemeralAuthenticated: true,
      ephemeralWalletAddress: "11111111111111111111111111111111",
      applicationPolicyId: "studio-acme-wallet_control-v1",
    });
    expect(solana.mode).toBe("verified_compact");
    expect(solana.proof_source).toBe("ephemeral_sandbox_receipt");
    expect(solana.reuse_eligible).toBe(true);
  });

  it("requires connect when proof not validated", () => {
    const solana = resolveIntegrationStudioSolanaSurface({
      studioBinding: notAttached,
      journey: {
        ...journeyValidated,
        wallet_proof_validated: false,
        policy_locked: false,
        policy_lock_reasons: ["wallet_proof_not_validated"],
      },
      ephemeralAuthenticated: true,
      ephemeralWalletAddress: "11111111111111111111111111111111",
      applicationPolicyId: "studio-acme-wallet_control-v1",
    });
    expect(solana.mode).toBe("connect_required");
    expect(solana.reuse_eligible).toBe(false);
  });

  it("blocks reuse when application policy pack differs from proof policy", () => {
    const solana = resolveIntegrationStudioSolanaSurface({
      studioBinding: notAttached,
      journey: { ...journeyValidated, policy_id: "age_21_retail", studio_pack_id: "age_21_retail" },
      ephemeralAuthenticated: true,
      ephemeralWalletAddress: "11111111111111111111111111111111",
      applicationPolicyId: "studio-acme-wallet_control-v1",
    });
    expect(solana.mode).toBe("action_required");
    expect(solana.require_signature_reason).toMatch(/different policy/i);
  });

  it("prefers active studio binding when present", () => {
    const solana = resolveIntegrationStudioSolanaSurface({
      studioBinding: {
        ok: true,
        status: "bound",
        binding_ref: "bind_1",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      journey: null,
      ephemeralAuthenticated: false,
      ephemeralWalletAddress: null,
      applicationPolicyId: "studio-acme-wallet_control-v1",
    });
    expect(solana.mode).toBe("verified_compact");
    expect(solana.proof_source).toBe("studio_wallet_standard_binding");
  });

  it("hides EVM options on default hosted path unless already bound", () => {
    const surface = buildIntegrationStudioWalletSurface({
      studioBindings: { solana: notAttached, evm: notAttached },
      journey: journeyValidated,
      ephemeralAuthenticated: true,
      ephemeralWalletAddress: "11111111111111111111111111111111",
      applicationPolicyId: "studio-acme-wallet_control-v1",
      pathId: "hosted_partner_flow",
    });
    expect(surface.show_evm_options).toBe(false);
    expect(surface.solana.mode).toBe("verified_compact");
  });

  it("requires connect when session is not authenticated despite prior journey metadata", () => {
    const solana = resolveIntegrationStudioSolanaSurface({
      studioBinding: notAttached,
      journey: journeyValidated,
      ephemeralAuthenticated: false,
      ephemeralWalletAddress: null,
      applicationPolicyId: "studio-acme-wallet_control-v1",
    });
    expect(solana.mode).toBe("connect_required");
    expect(solana.reuse_eligible).toBe(false);
  });

  it("offers EVM on evm partner adapter path", () => {
    const surface = buildIntegrationStudioWalletSurface({
      studioBindings: { solana: notAttached, evm: notAttached },
      journey: journeyValidated,
      ephemeralAuthenticated: true,
      ephemeralWalletAddress: "11111111111111111111111111111111",
      applicationPolicyId: "studio-acme-wallet_control-v1",
      pathId: "evm_partner_adapter",
    });
    expect(surface.show_evm_options).toBe(true);
  });
});
