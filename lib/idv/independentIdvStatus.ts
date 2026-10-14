// FILE: lib/idv/independentIdvStatus.ts
// Runtime readiness for Abraxas independent biometric IDV (capture → review → credential).

import { createClient } from "@supabase/supabase-js";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import { getBiometricEngineHealth } from "@/lib/idv/biometric/biometricStatus";
import { getIdvProvider, idvProviderLabel, isAbraxasIndependentIdv } from "@/lib/idv/idvProvider";
import { persistenceUsesDirectPostgres, resolveIndependentPostgresUrl } from "@/lib/persistence/env";
import { countPendingIdentityReviewQueueDirect } from "@/lib/persistence/idvDirectStore";
import { getActiveSuiNetwork, isSuiMainnetDeployed, resolveSuiDeployment } from "@/lib/sui/config";
import { getSponsorConfig, isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export type IndependentIdvItemStatus = "live" | "partial" | "not_configured";

export interface IndependentIdvStatus {
  provider: ReturnType<typeof getIdvProvider>;
  abraxas_independent: boolean;
  label: string;
  status: IndependentIdvItemStatus;
  summary: string;
  capture_flow: string;
  review_queue: string;
  health_endpoint: string;
  signing_key_configured: boolean;
  browser_session_configured: boolean;
  supabase_configured: boolean;
  postgres_direct_configured: boolean;
  on_chain_issuer_configured: boolean;
  sui_network: string;
  sui_package_deployed: boolean;
  sui_mainnet_deployed: boolean;
  mainnet_package_missing: boolean;
  pending_review_count: number | null;
  biometric_engine: ReturnType<typeof getBiometricEngineHealth>;
  blockers: string[];
}

function sessionSecretConfigured(): boolean {
  return Boolean(
    process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_SIGNING_KEY?.trim(),
  );
}

function sovereignPersistenceReady(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(
    resolveIndependentPostgresUrl(env)
    && env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim()
    && env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY?.trim(),
  );
}

async function countPendingReviews(): Promise<number | null> {
  if (persistenceUsesDirectPostgres()) {
    try {
      return await countPendingIdentityReviewQueueDirect();
    } catch {
      return null;
    }
  }
  if (!SB_URL || !SB_KEY) return null;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { count, error } = await sb
    .from("passport_documents")
    .select("id", { count: "exact", head: true })
    .eq("stamp_id", "identity")
    .eq("status", "submitted");
  if (error) return null;
  return count ?? 0;
}

export async function getIndependentIdvStatus(): Promise<IndependentIdvStatus> {
  const provider = getIdvProvider();
  const abraxasIndependent = isAbraxasIndependentIdv();
  const signingConfigured = Boolean(loadReceiptSigningKey());
  const browserSessionConfigured = sessionSecretConfigured();
  const supabaseConfigured = Boolean(SB_URL && SB_KEY);
  const postgresDirectConfigured = persistenceUsesDirectPostgres() && sovereignPersistenceReady();
  const issuerConfigured = isPassportIssuerConfigured();
  const resolved = resolveSuiDeployment();
  const sponsor = getSponsorConfig();
  const pendingReviewCount = await countPendingReviews();
  const biometricEngine = getBiometricEngineHealth();

  const blockers: string[] = [];

  if (!abraxasIndependent) {
    blockers.push("Set IDV_PROVIDER=manual for Abraxas Verify (default). Legacy Veriff requires IDV_PROVIDER=veriff.");
  }
  if (!signingConfigured) {
    blockers.push("ABRAXAS_SIGNING_KEY for L2 credential issuance");
  }
  if (!browserSessionConfigured) {
    blockers.push("ABRAXAS_BROWSER_SESSION_SECRET or ABRAXAS_SIGNING_KEY for capture session auth");
  }
  if (persistenceUsesDirectPostgres()) {
    if (!resolveIndependentPostgresUrl(process.env)) {
      blockers.push("ABRAXAS_DATABASE_URL for postgres_direct persistence");
    }
    if (!process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim()) {
      blockers.push("ABRAXAS_EVIDENCE_STORAGE_ROOT for encrypted evidence custody");
    }
    if (!process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY?.trim()) {
      blockers.push("ABRAXAS_EVIDENCE_ENCRYPTION_KEY for encrypted evidence custody");
    }
  } else if (!supabaseConfigured) {
    blockers.push("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for legacy document storage");
  }
  if (!issuerConfigured) {
    blockers.push("SUI_SPONSOR_SECRET_KEY + SUI_ISSUANCE_CAP_OBJECT_ID for on chain stamps");
  } else if (!sponsor.configured) {
    blockers.push("Sponsor wallet or issuance cap misconfigured, check /api/sui/passport/sponsor");
  }
  if (!resolved.deployment.packageId?.startsWith("0x")) {
    blockers.push(`Sui package not deployed on ${getActiveSuiNetwork()}, run sui:deploy`);
  }

  const persistenceReady = postgresDirectConfigured || supabaseConfigured;

  const coreLive =
    abraxasIndependent
    && signingConfigured
    && browserSessionConfigured
    && persistenceReady;

  const fullLive = coreLive && issuerConfigured && Boolean(resolved.deployment.packageId?.startsWith("0x"));

  const status: IndependentIdvItemStatus = fullLive
    ? "live"
    : coreLive || signingConfigured || persistenceReady
      ? "partial"
      : "not_configured";

  const summary = abraxasIndependent
    ? fullLive
      ? "Independent biometric IDV is production ready: Abraxas Verify engine, capture, review, credential, and on chain stamps."
      : coreLive
        ? persistenceUsesDirectPostgres()
          ? "Sovereign postgres_direct capture and review ready; optional Sui stamps not configured."
          : "Capture and review path ready; configure Sui sponsor for on chain stamps."
        : `${blockers.length} blocker(s), see independent IDV health.`
    : `Legacy Veriff is active (${idvProviderLabel(provider)}). Abraxas Verify is default, remove IDV_PROVIDER=veriff.`;

  return {
    provider,
    abraxas_independent: abraxasIndependent,
    label: idvProviderLabel(provider),
    status,
    summary,
    capture_flow: "name + id_front + selfie",
    review_queue: "/admin/identity",
    health_endpoint: "/api/idv/independent/status",
    signing_key_configured: signingConfigured,
    browser_session_configured: browserSessionConfigured,
    supabase_configured: supabaseConfigured,
    postgres_direct_configured: postgresDirectConfigured,
    on_chain_issuer_configured: issuerConfigured,
    sui_network: getActiveSuiNetwork(),
    sui_package_deployed: Boolean(resolved.deployment.packageId?.startsWith("0x")),
    sui_mainnet_deployed: isSuiMainnetDeployed(),
    mainnet_package_missing: resolved.mainnetPackageMissing,
    pending_review_count: pendingReviewCount,
    biometric_engine: biometricEngine,
    blockers: abraxasIndependent ? blockers : ["IDV_PROVIDER=veriff, Abraxas Verify capture disabled"],
  };
}
