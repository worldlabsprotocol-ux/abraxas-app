import { parseOnchainDeploymentManifest, onchainGatePayloadLeaks } from "@/lib/partner/onchainGateDeployments/parseManifest";
import { evmDigestFromManifest, solanaDigestFromManifest } from "@/lib/partner/onchainGateDeployments/digests";
import { hashEnvironment } from "@/lib/partner/chainAttestation/hashes";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  SOLANA_ATTESTATION_MESSAGE_LEN,
  SOLANA_ATTESTATION_MESSAGE_PREFIX,
} from "@/lib/partner/chainAttestation/contract";
import { verifyInstitutionalPlan } from "@/lib/partner/testnetGateDeploymentKit/verify";
import { classifyKitFile, isPlanningEnvelope } from "@/lib/partner/testnetGateDeploymentKit/classify";
import {
  solanaObservationHasV2InstitutionalCapability,
  solanaObservationIsV1Only,
} from "@/lib/partner/onchainGateDeployments/adapters";
import { institutionalClassFromFlag, institutionalLabel } from "@/lib/partner/onchainGateDeployments/institutionalClass";
import type { OnchainVerifierConformanceReason } from "./contract";
import { ONCHAIN_VERIFIER_CONFORMANCE_FORBIDDEN_KEYS } from "./contract";
import { CONFORMANCE_VECTOR_PACKAGE, evmConformanceDigest, solanaConformanceMessage } from "./vectors";
import { PUBLIC_VERIFIER_PACKAGE } from "./artifacts";

export interface ConformanceInput {
  raw: unknown;
  nowSeconds?: number;
  consumedNonces?: string[];
  trustedSignerKeyId?: string;
  trustedSignerStatus?: "active" | "retiring" | "revoked";
  receiptRefetched?: boolean;
  fromBrowser?: boolean;
  institutionalRequired?: boolean;
  evmObservation?: { requireInstitutional?: boolean };
  solanaObservation?: {
    canonicalMessageLen?: number;
    schemaVersion?: number;
    requireInstitutional?: boolean;
    institutionalCapable?: boolean;
  };
}

export interface ConformanceResult {
  ok: boolean;
  reasons: OnchainVerifierConformanceReason[];
  gate_type: "evm" | "solana" | "vectors" | "unknown";
  schema_version: string;
  network_id: string;
  deployment_ref: string;
  signer_key_id: string;
  file_kind: "plan_envelope" | "registry_manifest" | "vectors" | "invalid";
  require_institutional: boolean;
  institutional_class: "institutional_v2" | "standard";
  institutional_label: string;
}

function leaks(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value as object).filter((key) =>
    (ONCHAIN_VERIFIER_CONFORMANCE_FORBIDDEN_KEYS as readonly string[]).includes(key),
  );
}

export function rejectBrowserConformanceMark(input: { from_browser?: boolean; request?: unknown }): {
  ok: false;
  reason: "unauthorized";
} {
  void input;
  return { ok: false, reason: "unauthorized" };
}

export function evaluateConformance(input: ConformanceInput): ConformanceResult {
  const reasons: OnchainVerifierConformanceReason[] = [];
  const fileKind = classifyKitFile(input.raw);
  if (input.fromBrowser) reasons.push("unauthorized");
  if (isPlanningEnvelope(input.raw)) {
    const secretLeaks = leaks(input.raw).filter((key) => key !== "live");
    if (secretLeaks.length) reasons.push("forbidden_field");
    const envelope = input.raw;
    const institutional = envelope.institutional;
    if (institutional) {
      const plan = verifyInstitutionalPlan(institutional, envelope);
      if (!plan.ok && plan.reason === "institutional_required") reasons.push("institutional_required");
      if (!plan.ok && plan.reason === "schema_mismatch") reasons.push("schema_mismatch");
      if (!plan.ok && (plan.reason === "signer_mismatch" || plan.reason === "binding_mismatch")) {
        reasons.push(plan.reason === "signer_mismatch" ? "signer_mismatch" : "binding_mismatch");
      }
    }
    reasons.push("plan_envelope");
    const unique = reasons.filter((reason, index) => reasons.indexOf(reason) === index);
    const plannedInstitutional = Boolean(institutional?.institutional_required);
    return {
      ok: false,
      reasons: unique,
      gate_type: envelope.gate_type,
      schema_version: envelope.institutional ? "2" : "1",
      network_id: envelope.network_id,
      deployment_ref: "",
      signer_key_id: envelope.bindings.signer_key_id,
      file_kind: "plan_envelope",
      require_institutional: plannedInstitutional,
      institutional_class: institutionalClassFromFlag(plannedInstitutional),
      institutional_label: institutionalLabel(plannedInstitutional),
    };
  }
  if (leaks(input.raw).length || onchainGatePayloadLeaks(input.raw).length) reasons.push("forbidden_field");
  if (input.receiptRefetched === false) reasons.push("presentation_insufficient");

  const envelope = input.raw && typeof input.raw === "object" ? input.raw as Record<string, unknown> : {};
  const observedInstitutional = input.solanaObservation
    ? solanaObservationHasV2InstitutionalCapability(input.solanaObservation as never)
    : input.evmObservation?.requireInstitutional === true;
  const requireInstitutional = observedInstitutional;

  if (requireInstitutional && envelope.institutional) {
    const plan = verifyInstitutionalPlan(envelope.institutional as never, envelope as never, input.nowSeconds);
    if (!plan.ok && plan.reason === "expired") reasons.push("expired");
    if (!plan.ok && plan.reason === "institutional_required") reasons.push("institutional_required");
    if (!plan.ok && plan.reason === "schema_mismatch") reasons.push("schema_mismatch");
    if (!plan.ok && (plan.reason === "signer_mismatch" || plan.reason === "binding_mismatch")) {
      reasons.push(plan.reason === "signer_mismatch" ? "signer_mismatch" : "binding_mismatch");
    }
  }

  const manifestCandidate = envelope.registry_manifest ?? input.raw;
  const parsed = parseOnchainDeploymentManifest(manifestCandidate);
  if (!parsed.ok) {
    if (!reasons.includes("forbidden_field") && !reasons.includes("unauthorized")) reasons.push("invalid");
    return {
      ok: reasons.length === 0,
      reasons: reasons.length ? reasons : ["invalid"],
      gate_type: "unknown",
      schema_version: "",
      network_id: "",
      deployment_ref: typeof envelope.deployment_ref === "string" ? envelope.deployment_ref : "",
      signer_key_id: "",
      file_kind: fileKind === "registry_manifest" ? "registry_manifest" : "invalid",
      require_institutional: false,
      institutional_class: "standard",
      institutional_label: institutionalLabel(false),
    };
  }

  const manifest = parsed.manifest;
  if (manifest.environment !== "sandbox" && manifest.environment !== "production") reasons.push("binding_mismatch");
  const envHash = hashEnvironment(manifest.environment);
  const digest = manifest.gate_type === "evm"
    ? evmDigestFromManifest(manifest, envHash)
    : solanaDigestFromManifest(manifest, envHash);
  if (digest !== manifest.config_digest) reasons.push("binding_mismatch");

  const trusted = input.trustedSignerKeyId ?? manifest.signer_key_id;
  if (trusted !== manifest.signer_key_id) reasons.push("signer_mismatch");
  if (input.trustedSignerStatus && input.trustedSignerStatus !== "active") reasons.push("signer_update_required");

  const nonce = typeof envelope.nonce === "string" ? envelope.nonce : "";
  if (nonce && input.consumedNonces?.includes(nonce)) reasons.push("replayed");
  const expiresAt = typeof envelope.expires_at === "number" ? envelope.expires_at : 0;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt <= now) reasons.push("expired");

  if (manifest.gate_type === "solana" && input.institutionalRequired === true) {
    if (!input.solanaObservation) {
      if (!reasons.includes("deployment_not_verified")) reasons.push("deployment_not_verified");
    } else if (
      solanaObservationIsV1Only(input.solanaObservation as never)
      || !solanaObservationHasV2InstitutionalCapability(input.solanaObservation as never)
    ) {
      reasons.push("institutional_required");
    }
  }
  if (requireInstitutional) {
    const eip712 = envelope.eip712 as { version?: string } | undefined;
    if (manifest.gate_type === "evm" && eip712 && eip712.version !== "2") reasons.push("schema_mismatch");
    if (manifest.gate_type === "solana") {
      const v2 = envelope.solana_v2 as { message_len?: number; prefix?: string; schema_version?: number } | undefined;
      if (v2 && (v2.message_len !== SOLANA_ATTESTATION_MESSAGE_LEN || v2.prefix !== SOLANA_ATTESTATION_MESSAGE_PREFIX || v2.schema_version !== 2)) {
        reasons.push("institutional_required");
      }
    }
    if (input.receiptRefetched !== true) reasons.push("presentation_insufficient");
  }

  if (envelope.schema_version === 1 && requireInstitutional) reasons.push("institutional_required");
  if (envelope.domain_name && envelope.domain_name !== EIP712_DOMAIN_NAME) reasons.push("domain_mismatch");
  if (envelope.domain_version && envelope.domain_version !== EIP712_DOMAIN_VERSION) reasons.push("domain_mismatch");

  const unique = reasons.filter((reason, index) => reasons.indexOf(reason) === index);
  return {
    ok: unique.length === 0,
    reasons: unique,
    gate_type: manifest.gate_type,
    schema_version: requireInstitutional ? "2" : String(manifest.schema_version),
    network_id: manifest.network_id,
    deployment_ref: typeof envelope.deployment_ref === "string" ? envelope.deployment_ref : "",
    signer_key_id: manifest.signer_key_id,
    file_kind: "registry_manifest",
    require_institutional: requireInstitutional,
    institutional_class: institutionalClassFromFlag(requireInstitutional),
    institutional_label: institutionalLabel(requireInstitutional),
  };
}

export function evaluateVectorConformance(): ConformanceResult {
  const evmOk = evmConformanceDigest() === CONFORMANCE_VECTOR_PACKAGE.evm.digest;
  const solOk = solanaConformanceMessage() === CONFORMANCE_VECTOR_PACKAGE.solana_v2.message_hex;
  const artifactsOk = PUBLIC_VERIFIER_PACKAGE.evm.payable === false
    && PUBLIC_VERIFIER_PACKAGE.solana.token_calls === false
    && PUBLIC_VERIFIER_PACKAGE.solana.message_len === 468;
  return {
    ok: evmOk && solOk && artifactsOk,
    reasons: evmOk && solOk && artifactsOk ? [] : ["invalid"],
    gate_type: "vectors",
    schema_version: "2",
    network_id: "local_vectors",
    deployment_ref: "",
    signer_key_id: "evm-attestation-test-1",
    file_kind: "vectors",
    require_institutional: true,
    institutional_class: "institutional_v2",
    institutional_label: institutionalLabel(true),
  };
}
