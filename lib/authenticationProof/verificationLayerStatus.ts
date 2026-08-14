// FILE: lib/authenticationProof/verificationLayerStatus.ts
// Honest runtime status for the verification-layer items (independent IDV + proof loop).

import { parseEnvBool } from "@/lib/env/parseEnvBool";
import { getAssetMonitoringGateStatus } from "@/lib/assetMonitoring/gateStatus";
import { loadReceiptSigningKey, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";
import { checkAuthenticationProofsTable } from "@/lib/authenticationProof/persistAuthenticationProof";
import { getIndependentIdvStatus } from "@/lib/idv/independentIdvStatus";
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
  independent_idv_status: "live" | "partial" | "not_configured";
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
  const proofsTable = await checkAuthenticationProofsTable();
  const persistenceLive = proofsTable.writable;
  const independentIdv = await getIndependentIdvStatus();

  const engine = independentIdv.biometric_engine;
  const independentBiometric: VerificationLayerItem = {
    id: "independent-biometric-idv",
    label: "Abraxas Verify biometric IDV (capture → engine → L2/L3 credential + stamps)",
    status: independentIdv.status,
    detail: engine.auto_approve_enabled
      ? `${independentIdv.summary} Engine auto-approve enabled for L3.`
      : `${independentIdv.summary} ${engine.summary}`,
    blockers: [
      ...independentIdv.blockers,
      ...(independentIdv.abraxas_independent ? engine.blockers : []),
    ],
  };

  const credentialsVerify: VerificationLayerItem = {
    id: "credentials-verify",
    label: "POST /api/credentials/verify returns proof bundle on every decision",
    status: statusFromFlags(
      signingConfigured && supabaseConfigured && persistenceLive,
      signingConfigured || supabaseConfigured,
    ),
    detail: signingConfigured
      ? "Issues signed authentication_proof + decision_receipt (when receipt DB available) with proof_id and verify_url."
      : "Code path exists; proofs are unsigned until ABRAXAS_SIGNING_KEY is set.",
    blockers: [
      ...(!signingConfigured ? ["ABRAXAS_SIGNING_KEY"] : []),
      ...(!supabaseConfigured ? ["NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for proof persistence"] : []),
      ...(!persistenceLive ? [proofsTable.hint ?? "Run migration 042_authentication_proofs.sql"] : []),
    ],
  };

  const proofLookup: VerificationLayerItem = {
    id: "proof-lookup",
    label: "GET /api/proof/[id] is fully self-verifying",
    status: statusFromFlags(
      signingConfigured && verificationKeyConfigured && supabaseConfigured && persistenceLive,
      verificationKeyConfigured || signingConfigured,
    ),
    detail: persistenceLive
      ? "Returns payload, signature, public_key, signature_valid, anchor_status, and Sui fields when present."
      : "Env configured but proofs are not persisting — run migrations 042–044 in Supabase.",
    blockers: [
      ...(!verificationKeyConfigured ? ["ABRAXAS_PUBLIC_KEY or ABRAXAS_SIGNING_KEY"] : []),
      ...(!supabaseConfigured ? ["NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"] : []),
      ...(!persistenceLive ? [proofsTable.hint ?? "authentication_proofs table not writable — run migration 042"] : []),
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

  const agentReadiness: VerificationLayerItem = {
    id: "agent-readiness",
    label: "AI agent / MCP-ready verify + proof envelopes",
    status: statusFromFlags(signingConfigured && verificationKeyConfigured, signingConfigured || verificationKeyConfigured),
    detail:
      "POST /api/credentials/verify and GET /api/proof/[id] return agent.proceed / agent.valid. See GET /api/verify/e2e and /api/docs/agents.",
    blockers: [
      ...(!signingConfigured ? ["ABRAXAS_SIGNING_KEY"] : []),
      ...(!verificationKeyConfigured ? ["ABRAXAS_PUBLIC_KEY"] : []),
    ],
  };

  const assetMonitoring: VerificationLayerItem = {
    id: "asset-monitoring",
    label: "Asset monitoring → refresh/revoke proof path",
    status: statusFromFlags(monitoringGate.met, monitoringGate.autoApply || monitoringGate.lotInventoryRows > 0),
    detail:
      "GET /api/asset-monitoring/preview evaluates signals; apply path issues asset_state_change proofs and supersedes prior proofs.",
    blockers: [
      ...(!monitoringGate.autoApply ? ["ASSET_MONITORING_AUTO_APPLY=true (redeploy Vercel after setting)"] : []),
      ...(monitoringGate.lotInventoryRows === 0 ? ["asset_lot_inventory rows in production DB (run migration 045 or bootstrap script)"] : []),
    ],
  };

  const e2eLoop: VerificationLayerItem = {
    id: "e2e-loop",
    label: "Closed E2E loop: verify → persist → lookup → agent.valid",
    status: statusFromFlags(
      credentialsVerify.status === "live" &&
        proofLookup.status === "live" &&
        productionDemo.status === "live" &&
        agentReadiness.status === "live" &&
        persistenceLive,
      credentialsVerify.status === "partial" ||
        proofLookup.status === "partial" ||
        productionDemo.status === "partial" ||
        agentReadiness.status === "partial",
    ),
    detail:
      "GET /api/verify/e2e runs production reference path and confirms agent.proceed + agent.valid with persistence roundtrip.",
    blockers: [
      ...credentialsVerify.blockers,
      ...proofLookup.blockers.filter((b) => !credentialsVerify.blockers.includes(b)),
    ],
  };

  const items = [
    independentBiometric,
    credentialsVerify,
    proofLookup,
    suiAnchoring,
    productionDemo,
    agentReadiness,
    assetMonitoring,
    e2eLoop,
  ];

  const liveCount = items.filter(i => i.status === "live").length;
  const partialCount = items.filter(i => i.status === "partial").length;

  const summary =
    liveCount === items.length
      ? "All verification-layer engineering checks are passing."
      : liveCount + partialCount > 0
        ? `${liveCount} live, ${partialCount} partial — see blockers per item.`
        : "Verification layer code exists but production keys and persistence are not configured.";

  return {
    summary,
    signing_configured: signingConfigured,
    verification_key_configured: verificationKeyConfigured,
    supabase_configured: supabaseConfigured,
    independent_idv_status: independentIdv.status,
    items,
    sui_network: getActiveSuiNetwork(),
  };
}
