// Read-only operator preflight — not a substitute for live production verification.

import { probeInstitutionalReplayReadiness } from "@/lib/institutional/replayReadinessProbe";
import { probeMigration140InsertRevoked } from "@/lib/institutional/replayMigration140Probe";
import { evaluateSolanaMainnetPromotionGate } from "@/lib/institutional/solanaMainnetPromotionGate";
import {
  mapGovernanceReportToPromotionInputs,
  runSolanaMainnetGovernanceVerification,
} from "@/lib/institutional/solanaMainnetGovernanceVerifier";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";

export type ReadinessCheckVerdict = "PASS" | "FAIL" | "BLOCKED";

export type InstitutionalReadinessCheck = {
  id: string;
  label: string;
  verdict: ReadinessCheckVerdict;
  detail: string;
  evidence_ref: string;
};

export type InstitutionalEnvironmentReadinessReport = {
  schema: "institutional_environment_readiness_v1";
  overall: ReadinessCheckVerdict;
  vercel_ready_is_not_production_ready: true;
  checks: InstitutionalReadinessCheck[];
  production_consume_available: boolean;
  sandbox_pilot_technically_ready: boolean;
};

function check(
  id: string,
  label: string,
  verdict: ReadinessCheckVerdict,
  detail: string,
  evidence_ref: string,
): InstitutionalReadinessCheck {
  return { id, label, verdict, detail, evidence_ref };
}

export async function evaluateInstitutionalEnvironmentReadiness(): Promise<InstitutionalEnvironmentReadinessReport> {
  const checks: InstitutionalReadinessCheck[] = [];

  checks.push(check(
    "vercel_not_production",
    "Vercel READY does not imply production institutional readiness",
    "PASS",
    "explicit_non_equivalence",
    "Build #525 readiness gate",
  ));

  const replay = await probeInstitutionalReplayReadiness();
  const migration140Revoked = await probeMigration140InsertRevoked();
  checks.push(check(
    "migration_139_rpc",
    "Migration 139 replay RPC reachable",
    replay.migration_139_function_present && replay.probe_result === "rpc_responded" ? "PASS" : replay.probe_result === "schema_missing" ? "FAIL" : "BLOCKED",
    replay.detail,
    "supabase/migrations/139_institutional_eligibility_consume_nonces.sql",
  ));

  checks.push(check(
    "migration_140_hardening",
    "Migration 140 hardening applied (direct INSERT revoked)",
    migration140Revoked === true ? "PASS" : migration140Revoked === false ? "FAIL" : "BLOCKED",
    migration140Revoked == null ? "requires_privilege_probe_or_demo_db" : String(migration140Revoked),
    "supabase/migrations/140_institutional_replay_rpc_hardening.sql",
  ));

  checks.push(check(
    "durable_replay_availability",
    "Durable replay store available for consume",
    replay.consume_available ? "PASS" : "FAIL",
    replay.probe_result,
    "lib/institutional/replayReadinessProbe.ts",
  ));

  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  checks.push(check(
    "supabase_admin",
    "Supabase service role configured",
    supabaseConfigured ? "PASS" : "BLOCKED",
    supabaseConfigured ? "configured" : "missing_env",
    "SUPABASE_SERVICE_ROLE_KEY",
  ));

  const signingConfigured = Boolean(process.env.ABRAXAS_SIGNING_KEY?.trim());
  checks.push(check(
    "receipt_signer",
    "Decision receipt signing material configured",
    signingConfigured ? "PASS" : "BLOCKED",
    signingConfigured ? "key_present" : "ABRAXAS_SIGNING_KEY_missing",
    "lib/decisionReceipts/signing.ts",
  ));

  checks.push(check(
    "replay_hmac_key",
    "Replay nonce HMAC key configured",
    Boolean(process.env.NEXTAUTH_SECRET?.trim()) ? "PASS" : "BLOCKED",
    "NEXTAUTH_SECRET",
    "lib/institutional/replayKeyDerivation.ts",
  ));

  checks.push(check(
    "webhook_signing",
    "Partner webhook signing available",
    "PASS",
    "verifyWebhookSignature",
    "lib/partner/webhooks/webhookSigning.ts",
  ));

  checks.push(check(
    "audit_telemetry",
    "Institutional security telemetry path",
    supabaseConfigured ? "PASS" : "BLOCKED",
    "appendAuditEvent via service role",
    "lib/institutional/securityTelemetry.ts",
  ));

  const mainnetCap = getNetworkCapability("solana_mainnet");
  const mainnetDisabled = mainnetCap?.status !== "available" && mainnetCap?.status !== "configured";
  checks.push(check(
    "mainnet_issuance_gate",
    "Mainnet issuance disabled",
    mainnetDisabled ? "PASS" : "FAIL",
    mainnetCap?.status ?? "unknown",
    "lib/partner/networkCapability/registry",
  ));

  const governance = await runSolanaMainnetGovernanceVerification({
    signerRotationDocumented: Boolean(process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true"),
    signerCustodyDocumented: Boolean(process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true"),
    finalizedConfirmationPolicyDocumented: true,
  });
  const promotion = evaluateSolanaMainnetPromotionGate({
    ...mapGovernanceReportToPromotionInputs(governance),
    conformance_vectors_pass: Boolean(process.env.ABRAXAS_CONFORMANCE_VECTORS_PASS === "true"),
  });
  checks.push(check(
    "solana_promotion_gate",
    "Solana mainnet promotion gate",
    promotion.overall === "PASS" ? "PASS" : promotion.overall === "FAIL" ? "FAIL" : "BLOCKED",
    promotion.overall,
    "lib/institutional/solanaMainnetPromotionGate.ts",
  ));

  const hasFail = checks.some(c => c.verdict === "FAIL");
  const allPass = checks.every(c => c.verdict === "PASS");
  const overall: ReadinessCheckVerdict = hasFail ? "FAIL" : allPass ? "PASS" : "BLOCKED";

  const sandboxPilotReady =
    replay.consume_available
    && supabaseConfigured
    && signingConfigured
    && Boolean(process.env.NEXTAUTH_SECRET?.trim());

  return {
    schema: "institutional_environment_readiness_v1",
    overall,
    vercel_ready_is_not_production_ready: true,
    checks,
    production_consume_available: replay.consume_available,
    sandbox_pilot_technically_ready: sandboxPilotReady,
  };
}
