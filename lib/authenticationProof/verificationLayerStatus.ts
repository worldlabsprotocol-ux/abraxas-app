// FILE: lib/authenticationProof/verificationLayerStatus.ts
// Honest runtime status for the five critical verification-layer items.

import { getAssetMonitoringGateStatus } from "@/lib/assetMonitoring/gateStatus";
import { loadReceiptSigningKey, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";
import { getActiveSuiNetwork } from "@/lib/sui/config";
import { isProductionReferenceAsset } from "./productionReference";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export type VerificationItemStatus = "live" | "partial" | "not_configured";

export interface VerificationLayerItem {
  id: string;
  label: string;
  status: VerificationItemStatus;
  detail: string;
  blockers: string[];
}

export interface VerificationLayerStatus {
  summary: string;
  signing_configured: boolean;
  verification_key_configured: boolean;
  supabase_configured: boolean;
  sui_network: string;
  items: VerificationLayerItem[];
}

function statusFromFlags(live: boolean, partial: boolean): VerificationItemStatus {
  if (live) return "live";
  if (partial) return "partial";
  return "not_configured";
}

export async function getVerificationLayerStatus(): Promise<VerificationLayerStatus> {
  const signingConfigured = Boolean(loadReceiptSigningKey());
  const verificationKeyConfigured = Boolean(loadReceiptVerificationKey());
  const supabaseConfigured = Boolean(SB_URL && SB_KEY);
  const anchorEnabled = process.env.ON_CHAIN_ANCHOR_ENABLED !== "false";
  const suiIssuerConfigured = isPassportIssuerConfigured();
  const monitoringGate = await getAssetMonitoringGateStatus();

  const credentialsVerify: VerificationLayerItem = {
    id: "credentials-verify",
    label: "POST /api/credentials/verify returns proof bundle on every decision",
    status: statusFromFlags(
      signingConfigured && supabaseConfigured,
      signingConfigured || supabaseConfigured,
    ),
    detail: signingConfigured
      ? "Issues signed authentication_proof + decision_receipt (when receipt DB available) with proof_id and verify_url."
      : "Code path exists; proofs are unsigned until ABRAXAS_SIGNING_KEY is set.",
    blockers: [
      ...(!signingConfigured ? ["ABRAXAS_SIGNING_KEY"] : []),
      ...(!supabaseConfigured ? ["NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for proof persistence"] : []),
    ],
  };

  const proofLookup: VerificationLayerItem = {
    id: "proof-lookup",
    label: "GET /api/proof/[id] is fully self-verifying",
    status: statusFromFlags(
      signingConfigured && verificationKeyConfigured && supabaseConfigured,
      verificationKeyConfigured,
    ),
    detail: verificationKeyConfigured
      ? "Returns payload, signature, public_key, signature_valid, anchor_status, and Sui fields when present."
      : "ABRAXAS_PUBLIC_KEY (or ABRAXAS_SIGNING_KEY) required for signature_valid checks.",
    blockers: [
      ...(!verificationKeyConfigured ? ["ABRAXAS_PUBLIC_KEY or ABRAXAS_SIGNING_KEY"] : []),
      ...(!supabaseConfigured ? ["Supabase authentication_proofs table for lookup by proof_id"] : []),
    ],
  };

  const suiAnchoring: VerificationLayerItem = {
    id: "sui-anchoring",
    label: "Sui anchoring path (graceful signed fallback)",
    status: statusFromFlags(
      suiIssuerConfigured && anchorEnabled && signingConfigured,
      signingConfigured,
    ),
    detail: signingConfigured
      ? "Proofs issue with anchor_status signed until Move package redeploys anchor_authentication_proof."
      : "Anchoring skipped without signing; never blocks proof issuance.",
    blockers: [
      "Move package redeploy with anchor_authentication_proof",
      ...(!suiIssuerConfigured ? ["SUI_SPONSOR_SECRET_KEY + passport issuer config"] : []),
    ],
  };

  const productionDemo: VerificationLayerItem = {
    id: "production-demo",
    label: "Production reference proof (Cielo Sunrise / Chickasaw)",
    status: statusFromFlags(
      signingConfigured && isProductionReferenceAsset("ABX-RE-HOSP-001"),
      true,
    ),
    detail:
      "GET /api/proof/reference/ABX-RE-HOSP-001 issues a registry verification proof with self_verified_proof in the response.",
    blockers: [
      ...(!signingConfigured ? ["ABRAXAS_SIGNING_KEY for signed production reference proofs"] : []),
      ...(!supabaseConfigured ? ["Supabase for durable GET /api/proof/[id] lookup after issuance"] : []),
    ],
  };

  const assetMonitoring: VerificationLayerItem = {
    id: "asset-monitoring",
    label: "Asset monitoring → refresh/revoke proof path",
    status: statusFromFlags(monitoringGate.met, monitoringGate.autoApply || monitoringGate.lotInventoryRows > 0),
    detail:
      "GET /api/asset-monitoring/preview evaluates signals; apply path issues asset_state_change proofs and supersedes prior proofs.",
    blockers: [
      ...(!monitoringGate.autoApply ? ["ASSET_MONITORING_AUTO_APPLY=true for automated worker"] : []),
      ...(monitoringGate.lotInventoryRows === 0 ? ["asset_lot_inventory rows in production DB"] : []),
    ],
  };

  const items = [
    credentialsVerify,
    proofLookup,
    suiAnchoring,
    productionDemo,
    assetMonitoring,
  ];

  const liveCount = items.filter(i => i.status === "live").length;
  const partialCount = items.filter(i => i.status === "partial").length;

  const summary =
    liveCount === items.length
      ? "All five verification-layer items are production-ready."
      : liveCount + partialCount > 0
        ? `${liveCount} live, ${partialCount} partial — see blockers per item.`
        : "Verification layer code exists but production keys and persistence are not configured.";

  return {
    summary,
    signing_configured: signingConfigured,
    verification_key_configured: verificationKeyConfigured,
    supabase_configured: supabaseConfigured,
    items,
    sui_network: getActiveSuiNetwork(),
  };
}
