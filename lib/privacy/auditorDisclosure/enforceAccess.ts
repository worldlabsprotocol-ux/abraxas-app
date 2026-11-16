// FILE: lib/privacy/auditorDisclosure/enforceAccess.ts

import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  applyDisclosureProfile,
  detectDisclosureLeaks,
  resolveDisclosureProfile,
} from "@/lib/privacy/selectiveDisclosure";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import type { AuditorDisclosurePurpose, SignedAuditorDisclosureMandate } from "./contract";
import { authorizeRequestedDisclosurePurpose } from "./requestPurpose";
import { verifySignedAuditorDisclosureMandate } from "./signVerify";
import { isAuditorMandateRevokedInRegistry } from "./serverTrust";
import { buildAuditorDisclosureSource, type AuditorDisclosureCustodyMeta } from "./buildSource";
import { auditAuditorDisclosurePayload } from "./auditPrivacy";

export type AuditorDisclosureEnforcementResult =
  | {
      ok: true;
      disclosure: Record<string, unknown>;
      trust_boundaries: string[];
    }
  | {
      ok: false;
      reason: string;
      trust_boundary: string;
    };

export function evaluateAuditorDisclosureAccess(input: {
  signedMandate: SignedAuditorDisclosureMandate;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  environment: "demo" | "production";
  now: Date;
  presenter_auditor_id: string;
  tenant_id: string;
  receipt: DecisionReceiptRecord | null;
  custody: AuditorDisclosureCustodyMeta;
  request_context: {
    audience_hash: string;
    purpose: AuditorDisclosurePurpose;
  };
  principal_allowed_purposes: readonly AuditorDisclosurePurpose[];
  env?: Record<string, string | undefined>;
  minimumRegistryVersion?: number;
}): AuditorDisclosureEnforcementResult {
  const env = input.env ?? process.env;

  if (isAuditorMandateRevokedInRegistry(input.signedMandate.payload.mandate_id, env)) {
    return {
      ok: false,
      reason: "auditor_mandate_revoked_in_registry",
      trust_boundary: "continuity_revocation_registry",
    };
  }
  const verified = verifySignedAuditorDisclosureMandate({
    signed: input.signedMandate,
    signedIssuerAuthority: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    environment: input.environment,
    now: input.now,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });
  if (!verified.ok) {
    return { ok: false, reason: verified.reason, trust_boundary: verified.trust_boundary };
  }

  const mandate = verified.payload;

  const purposeAuthorized = authorizeRequestedDisclosurePurpose({
    requestedPurpose: input.request_context.purpose,
    mandatePurpose: mandate.purpose,
    principalAllowedPurposes: input.principal_allowed_purposes,
  });
  if (!purposeAuthorized.ok) {
    return {
      ok: false,
      reason: purposeAuthorized.reason,
      trust_boundary: "purpose_binding",
    };
  }

  if (mandate.audience_hash !== input.request_context.audience_hash) {
    return { ok: false, reason: "auditor_mandate_audience_mismatch", trust_boundary: "audience_binding" };
  }

  if (mandate.resource_kind !== "decision_receipt") {
    return {
      ok: false,
      reason: "auditor_disclosure_resource_kind_unsupported",
      trust_boundary: "resource_kind_binding",
    };
  }

  if (mandate.tenant_id !== input.tenant_id) {
    return { ok: false, reason: "auditor_mandate_tenant_mismatch", trust_boundary: "tenant_isolation" };
  }

  if (mandate.authorized_auditor_id !== input.presenter_auditor_id) {
    return { ok: false, reason: "auditor_mandate_actor_mismatch", trust_boundary: "auditor_binding" };
  }

  if (!input.receipt) {
    return { ok: false, reason: "auditor_disclosure_resource_not_found", trust_boundary: "resource_binding" };
  }

  if (input.receipt.id !== mandate.resource_ref) {
    return { ok: false, reason: "auditor_mandate_resource_mismatch", trust_boundary: "resource_binding" };
  }

  const receiptStatus = resolveReceiptStatus(input.receipt);
  if (receiptStatus !== "active") {
    return {
      ok: false,
      reason: `authoritative_receipt_status_${receiptStatus}`,
      trust_boundary: "receipt_current_validity",
    };
  }

  if (mandate.policy_id !== input.receipt.policy_id || mandate.policy_version !== input.receipt.policy_version) {
    return { ok: false, reason: "auditor_mandate_policy_mismatch", trust_boundary: "policy_binding" };
  }

  const pack = inferPolicyPackFromPolicyId(input.receipt.policy_id);
  const profileResolved = resolveDisclosureProfile(pack?.id ?? null);
  if (!profileResolved.ok) {
    return { ok: false, reason: "auditor_disclosure_profile_unavailable", trust_boundary: "disclosure_catalog" };
  }

  const source = buildAuditorDisclosureSource({
    record: input.receipt,
    mandate,
    custody: input.custody,
  });

  const applied = applyDisclosureProfile(source, profileResolved.profile, "auditor_review");
  if (!applied.ok) {
    return {
      ok: false,
      reason: applied.reason === "disclosure_leak" ? "auditor_disclosure_leak_detected" : "auditor_disclosure_invalid",
      trust_boundary: "selective_disclosure_enforcement",
    };
  }

  const forbiddenScan = auditAuditorDisclosurePayload(applied.payload);
  if (forbiddenScan.forbidden_field_count > 0) {
    return {
      ok: false,
      reason: "auditor_forbidden_field_scan_failed",
      trust_boundary: "auditor_forbidden_fields",
    };
  }

  const leakScan = detectDisclosureLeaks(applied.payload);
  if (leakScan.length > 0) {
    return {
      ok: false,
      reason: "auditor_disclosure_leak_detected",
      trust_boundary: "disclosure_leak_detector",
    };
  }

  return {
    ok: true,
    disclosure: applied.payload,
    trust_boundaries: [
      "auditor_mandate_cryptography",
      "issuer_authority_current_validity",
      "tenant_isolation",
      "resource_binding",
      "selective_disclosure_auditor_review",
    ],
  };
}