// FILE: lib/partner/networkCapability/profile.ts
// Launchpad Network readiness view. Server-derived. Never activates Mainnet.

import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";
import { launchpadGoLiveHref } from "@/lib/partner/launchpad/goLiveReadiness/contract";
import { deriveSelectedCapabilities, type GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import { NETWORK_CAPABILITY_REGISTRY } from "./registry";
import { NETWORK_CAPABILITY_NOTICE, type NetworkReadinessReason, type NetworkStatus } from "./types";

export const NETWORK_READINESS_VERSION = "1.0.0" as const;

export interface NetworkReadinessRow {
  network_id: string;
  display_label: string;
  ecosystem: string;
  environment: string;
  status: NetworkStatus;
  eligible_for_this_app: boolean;
  readiness_reason: NetworkReadinessReason;
  why_unavailable: string | null;
  abraxas_executes: false;
  docs_href: string;
}

export interface NetworkReadinessView {
  version: typeof NETWORK_READINESS_VERSION;
  application_id: string;
  policy_id: string;
  policy_version: number;
  app_environment: string;
  selected_capabilities: string[];
  production_access_approved: boolean;
  networks: NetworkReadinessRow[];
  before_mainnet_request: string[];
  review_href: string;
  google_is_account_only: string;
  notice: string;
  mutates_network: false;
  activates_mainnet: false;
  issues_production_key: false;
  executes_action: false;
  funds_movement: false;
}

function whyUnavailable(reason: NetworkReadinessReason, status: NetworkStatus): string | null {
  if (reason === "eligible") return null;
  if (reason === "planned") return "This network is planned until a real adapter exists. It is not available.";
  if (reason === "disabled" || status === "disabled") {
    return "This Mainnet network is not configured. It stays disabled until operators configure it and a reviewer approves Production access.";
  }
  if (reason === "production_review_required") {
    return "Mainnet use requires reviewed Production access. Requesting review does not activate the network, issue keys, or submit transactions.";
  }
  if (reason === "unsupported_action") return "The selected action is not supported on this network.";
  if (reason === "not_configured") return "This network is not configured for partner use.";
  return "This network is not ready for the requested Mainnet action.";
}

function rowForApp(input: {
  productionAccessApproved: boolean;
  capabilities: readonly string[];
  network: (typeof NETWORK_CAPABILITY_REGISTRY)[number];
}): NetworkReadinessRow {
  const entry = input.network;
  let reason: NetworkReadinessReason = "eligible";
  if (entry.status === "planned" || entry.environment === "planned") reason = "planned";
  else if (entry.status === "disabled") reason = "disabled";
  else if (entry.environment === "mainnet" && !input.productionAccessApproved) reason = "production_review_required";
  else if (entry.status === "production_review_required") reason = "production_review_required";
  else if (entry.status !== "configured" && entry.status !== "available") reason = "not_configured";

  const capabilityMatch =
    (entry.ecosystem === "solana" && input.capabilities.includes("solana_gate"))
    || (entry.ecosystem === "trading_venue" && input.capabilities.includes("trading_venue"))
    || (entry.ecosystem === "arc_circle" && (input.capabilities.includes("payment_authorization") || input.capabilities.includes("hosted_partner_flow")))
    || entry.ecosystem === "evm";

  const eligible = reason === "eligible" && capabilityMatch;
  if (reason === "eligible" && !capabilityMatch) {
    reason = "unsupported_action";
  }

  return {
    network_id: entry.network_id,
    display_label: entry.display_label,
    ecosystem: entry.ecosystem,
    environment: entry.environment,
    status: entry.status,
    eligible_for_this_app: eligible,
    readiness_reason: eligible ? "eligible" : reason,
    why_unavailable: eligible ? null : whyUnavailable(reason, entry.status),
    abraxas_executes: false,
    docs_href: entry.docs_href,
  };
}

export function buildNetworkReadinessView(evidence: GoLiveEvidence): NetworkReadinessView {
  const selected = deriveSelectedCapabilities(evidence);
  const approved = evidence.request?.status === "approved" || evidence.environment === "production";
  const networks = NETWORK_CAPABILITY_REGISTRY.map((network) => rowForApp({
    productionAccessApproved: approved,
    capabilities: selected,
    network,
  }));
  return {
    version: NETWORK_READINESS_VERSION,
    application_id: evidence.applicationId,
    policy_id: evidence.policyId,
    policy_version: evidence.policyVersion,
    app_environment: evidence.environment,
    selected_capabilities: selected,
    production_access_approved: approved,
    networks,
    before_mainnet_request: [
      "Finish sandbox Partner Flow, receipt verification, and the test console.",
      "Request reviewed Production access. That request is not approval, key issuance, or network activation.",
      "Wait until the target network is configured and not disabled.",
      "Keep a current public receipt and durable nonce/replay controls.",
      "Run chain or venue execution in your own integration. Abraxas never submits transactions or moves funds.",
    ],
    review_href: launchpadGoLiveHref(evidence.applicationId),
    google_is_account_only: GOOGLE_ACCOUNT_NOT_ELIGIBILITY,
    notice: NETWORK_CAPABILITY_NOTICE,
    mutates_network: false,
    activates_mainnet: false,
    issues_production_key: false,
    executes_action: false,
    funds_movement: false,
  };
}

export function networkReadinessLeaks(view: NetworkReadinessView): string[] {
  return studioPayloadLeaks(view);
}
