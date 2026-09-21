// FILE: lib/partner/integrationStudio/catalog.ts
// Safe public catalog derived from existing policy packs and eligibility plans.

import {
  POLICY_PACK_LIST,
  resolvePolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import { planEligibilityMethods } from "@/lib/partner/eligibilityMethods";
import { starterKitPublicCatalog } from "@/lib/partner/starterKit/contract";
import { partnerActivationPublicView } from "@/lib/partner/activationPath";
import { policyFitPublicChoices } from "@/lib/partner/integrationStudio/policyFit/contract";
import { selectableSandboxVenueProfiles } from "@/lib/partner/tradingVenue/profiles";
import {
  INTEGRATION_STUDIO_CHECKLIST,
  INTEGRATION_STUDIO_GOOGLE,
  INTEGRATION_STUDIO_PATHS,
  INTEGRATION_STUDIO_PROVISION,
  INTEGRATION_STUDIO_SOLANA_NOTICE,
  INTEGRATION_STUDIO_VENUE_NOTICE,
  INTEGRATION_STUDIO_WALLET_NOTICE,
  INTEGRATION_STUDIO_PAYMENT_NOTICE,
  INTEGRATION_STUDIO_PORTABLE_NOTICE,
  INTEGRATION_STUDIO_EVM_NOTICE,
  INTEGRATION_STUDIO_ONCHAIN_NOTICE,
  INTEGRATION_STUDIO_SOLANA_ONCHAIN_NOTICE,
  INTEGRATION_STUDIO_EVM_ONCHAIN_NOTICE,
  INTEGRATION_STUDIO_ELIGIBILITY_PRESENTATION_NOTICE,
  INTEGRATION_STUDIO_CROSS_CHAIN_PROTOCOL_NOTICE,
  INTEGRATION_STUDIO_WEBHOOK_NOTICE,
  type IntegrationStudioPathId,
} from "@/lib/partner/integrationStudio/contract";
import { SELECTIVE_DISCLOSURE_NOTICE } from "@/lib/privacy/selectiveDisclosure";
import { POLICY_COMPATIBILITY_NOTICE } from "@/lib/policy/compatibilityEdge";
import { NETWORK_CAPABILITY_NOTICE, publicNetworkMatrix } from "@/lib/partner/networkCapability";
import { evmGateLaunchpadPublicView } from "@/lib/partner/evmGate/readiness";

export interface StudioMethodView {
  id: string;
  label: string;
  qualifies: boolean;
  available: boolean;
  primary: boolean;
  why: string;
}

export interface StudioPackContract {
  pack_id: PolicyPackId;
  display_name: string;
  requirement: string;
  purpose: string;
  disclosed_result: string;
  withheld: string[];
  assurance: string;
  production_suitability: string;
  methods: StudioMethodView[];
  google_is_account_only: typeof INTEGRATION_STUDIO_GOOGLE;
  identity_is_default: false;
}

export function studioPackContract(packId: string): StudioPackContract | null {
  const pack = resolvePolicyPack(packId);
  if (!pack) return null;
  const plan = planEligibilityMethods({
    pack,
    privacyPreservingAvailable: true,
  });
  return {
    pack_id: pack.id,
    display_name: pack.display_name,
    requirement: plan.disclosure.requirement,
    purpose: plan.disclosure.purpose,
    disclosed_result: plan.disclosure.disclosed_result,
    withheld: [...plan.disclosure.withheld],
    assurance: plan.disclosure.assurance_level,
    production_suitability: pack.production_suitability,
    methods: plan.methods.map((method) => ({
      id: method.id,
      label: method.label,
      qualifies: method.qualifies,
      available: method.available,
      primary: method.primary,
      why: method.why,
    })),
    google_is_account_only: INTEGRATION_STUDIO_GOOGLE,
    identity_is_default: false,
  };
}

export function listStudioPackSummaries() {
  return POLICY_PACK_LIST.map((pack) => ({
    pack_id: pack.id,
    display_name: pack.display_name,
    disclosed_result: pack.disclosed_result,
    assurance: pack.minimum_assurance,
    production_suitability: pack.production_suitability,
  }));
}

export function studioPublicCatalog(input?: { packId?: string; pathId?: IntegrationStudioPathId }) {
  const pack = studioPackContract(input?.packId ?? "age_21_retail") ?? studioPackContract("age_21_retail");
  return {
    packs: listStudioPackSummaries(),
    contract: pack,
    paths: INTEGRATION_STUDIO_PATHS,
    selected_path: input?.pathId ?? "hosted_partner_flow",
    checklist: INTEGRATION_STUDIO_CHECKLIST,
    provision: INTEGRATION_STUDIO_PROVISION,
    webhook_is_not_authorization: INTEGRATION_STUDIO_WEBHOOK_NOTICE,
    solana: {
      creates_transactions: false,
      funds_movement: false,
      notice: INTEGRATION_STUDIO_SOLANA_NOTICE,
    },
    trading_venue: {
      creates_trades: false,
      creates_transactions: false,
      funds_movement: false,
      connects_wallet: false,
      notice: INTEGRATION_STUDIO_VENUE_NOTICE,
      profiles: selectableSandboxVenueProfiles().map((profile) => ({
        profile_id: profile.profile_id,
        label: profile.label,
        posture: profile.posture,
        docs_href: profile.docs_href,
        abraxas_executes: false as const,
      })),
    },
    wallet_standard: {
      required_for_passport: false,
      required_for_receipts: false,
      identity_verification: false,
      notice: INTEGRATION_STUDIO_WALLET_NOTICE,
    },
    starter_kit: starterKitPublicCatalog(),
    policy_fit: policyFitPublicChoices(),
    payment_authorization: {
      creates_payments: false,
      creates_transfers: false,
      funds_movement: false,
      calls_circle: false,
      notice: INTEGRATION_STUDIO_PAYMENT_NOTICE,
    },
    portable_action_contract: {
      executes_action: false,
      funds_movement: false,
      notice: INTEGRATION_STUDIO_PORTABLE_NOTICE,
    },
    evm_partner_adapter: {
      creates_transactions: false,
      funds_movement: false,
      connects_wallet: false,
      calls_rpc: false,
      notice: INTEGRATION_STUDIO_EVM_NOTICE,
    },
    onchain_protocol_gate: {
      creates_transactions: false,
      funds_movement: false,
      connects_wallet: false,
      calls_rpc: false,
      deploys_shared_contract: false,
      notice: INTEGRATION_STUDIO_ONCHAIN_NOTICE,
    },
    solana_onchain_eligibility_gate: {
      creates_transactions: false,
      funds_movement: false,
      connects_wallet: false,
      calls_rpc: false,
      deploys_shared_program: false,
      notice: INTEGRATION_STUDIO_SOLANA_ONCHAIN_NOTICE,
      deployment_registry: {
        docs: "/docs/onchain-gate-deployments",
        deploys: false,
        live: false,
      },
      signer_lifecycle: {
        docs: "/docs/chain-attestation-signer-lifecycle",
        broadcasts: false,
      },
    },
    evm_onchain_eligibility_gate: {
      creates_transactions: false,
      funds_movement: false,
      connects_wallet: false,
      calls_rpc: false,
      deploys_shared_contract: false,
      circle_settlement: false,
      notice: INTEGRATION_STUDIO_EVM_ONCHAIN_NOTICE,
      launchpad: evmGateLaunchpadPublicView(),
      deployment_registry: {
        docs: "/docs/onchain-gate-deployments",
        deploys: false,
        live: false,
      },
      signer_lifecycle: {
        docs: "/docs/chain-attestation-signer-lifecycle",
        broadcasts: false,
      },
    },
    selective_disclosure: {
      docs: "/docs/selective-disclosure",
      notice: SELECTIVE_DISCLOSURE_NOTICE,
    },
    reclaim_private_attestations: {
      docs: "/docs/reclaim-private-attestations",
      callback_path: "/api/reclaim/callback",
      partner_hosts_callback: false,
      origin_bound: true,
      receives_raw_proof: false,
      app_secret_in_browser: false,
    },
    eligibility_presentation: {
      docs: "/docs/eligibility-presentation-protocol",
      title: "Request a private eligibility presentation",
      presentation_sufficient: false,
      bearer_credential: false,
      automatic_kyc_kyb_approval: false,
      utila_integration: false,
      notice: INTEGRATION_STUDIO_ELIGIBILITY_PRESENTATION_NOTICE,
    },
    cross_chain_protocol_access: {
      docs: "/docs/cross-chain-protocol-access",
      title: "Build a cross-chain protocol gate",
      named_action: "activate_protocol_access",
      presentation_sufficient: false,
      funds_movement: false,
      creates_transactions: false,
      calls_rpc: false,
      deploys: false,
      notice: INTEGRATION_STUDIO_CROSS_CHAIN_PROTOCOL_NOTICE,
    },
    policy_compatibility: {
      docs: "/docs/policy-compatibility",
      notice: POLICY_COMPATIBILITY_NOTICE,
    },
    network_readiness: {
      docs: "/docs/multichain-mainnet-readiness",
      notice: NETWORK_CAPABILITY_NOTICE,
      executes_action: false,
      funds_movement: false,
      matrix: publicNetworkMatrix(),
    },
    activation: partnerActivationPublicView(),
  };
}
