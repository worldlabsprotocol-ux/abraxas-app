// FILE: lib/decisionReceipts/v1_1_0/authoritativeIssuance.server.ts
import "server-only";

import {
  blindEvidenceRef,
  buildEvidenceCommitment,
  deriveApplicationBindingRef,
  type EvidenceCommitmentEntryV1,
  type EvidenceCommitmentV1,
} from "@/lib/decisionReceipts/schema/v1_1_0";
import { deriveApplicationScopeFromAuthoritativeFacts } from "@/lib/decisionReceipts/currentValidity/applicationScopeContract";
import { getReceiptEvidenceDependencies } from "@/lib/decisionReceipts/evidenceDependencies";
import type { DecisionReceiptContext } from "@/lib/decisionReceipts/types";
import { encodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";

export class AuthoritativeIssuanceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "application_binding_secret_missing"
      | "application_scope_unavailable"
      | "application_unauthorized"
      | "evidence_commitment_incomplete"
      | "v11_anchor_sidecar_conflict",
  ) {
    super(message);
    this.name = "AuthoritativeIssuanceError";
  }
}

function loadApplicationBindingSecret(
  env: Record<string, string | undefined>,
): Buffer | null {
  const raw = env.DECISION_RECEIPT_APPLICATION_BINDING_SECRET?.trim();
  if (!raw) return null;
  return Buffer.from(raw, "utf8");
}

function loadEvidenceBlindingKey(env: Record<string, string | undefined>): Buffer | null {
  const raw = env.DECISION_RECEIPT_EVIDENCE_BLINDING_KEY?.trim();
  if (!raw) return null;
  return Buffer.from(raw, "utf8");
}

function blindId(material: string | null, blindingKey: Buffer | null): string | null {
  if (!material) return null;
  if (!blindingKey) return material;
  return blindEvidenceRef(material, blindingKey);
}

export async function resolveAuthoritativeApplicationBindingRef(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  decisionContext: DecisionReceiptContext;
  applicationId: string | null | undefined;
  env?: Record<string, string | undefined>;
}): Promise<string | null> {
  if (!input.applicationId) return null;

  const env = input.env ?? process.env;
  const scopeSecret = loadApplicationBindingSecret(env);
  if (!scopeSecret) {
    throw new AuthoritativeIssuanceError(
      "application_binding_secret_missing",
      "application_binding_secret_missing",
    );
  }

  const { getLaunchpadApplicationForPartner } = await import(
    "@/lib/partner/launchpad/resolveLaunchpadApplication.server"
  );
  const app = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
  const scope = deriveApplicationScopeFromAuthoritativeFacts({
    expectedApplicationId: input.applicationId,
    receiptPartnerId: input.partnerId,
    store_available: Boolean(app),
    facts: app
      ? {
          application_row_present: true,
          application_partner_id: app.partner_id,
          application_status: app.status,
          binding_row_present: true,
          binding_application_id: app.id,
          binding_partner_id: app.partner_id,
          binding_revoked_at: null,
        }
      : {
          application_row_present: false,
          application_partner_id: null,
          application_status: null,
          binding_row_present: false,
          binding_application_id: null,
          binding_partner_id: null,
          binding_revoked_at: null,
        },
  });

  if (!scope.store_available) {
    throw new AuthoritativeIssuanceError("application_scope_unavailable", "application_scope_unavailable");
  }
  if (!scope.application_scope_satisfied) {
    throw new AuthoritativeIssuanceError("application_unauthorized", "application_unauthorized");
  }

  return deriveApplicationBindingRef(
    {
      partner_id: input.partnerId,
      policy_id: input.policyId,
      policy_version: input.policyVersion,
      decision_context: input.decisionContext,
      launchpad_application_id: input.applicationId,
    },
    scopeSecret,
  );
}

export async function buildAuthoritativeEvidenceCommitment(input: {
  receiptId: string;
  requireFinalizedGraph: boolean;
  env?: Record<string, string | undefined>;
}): Promise<EvidenceCommitmentV1> {
  const deps = await getReceiptEvidenceDependencies(input.receiptId);
  const blindingKey = loadEvidenceBlindingKey(input.env ?? process.env);

  const entries: EvidenceCommitmentEntryV1[] = deps.map((row) => ({
    dependency_type: row.dependency_type,
    fact_id: blindId(row.fact_id, blindingKey),
    source_credential_id: blindId(row.source_credential_id, blindingKey),
  }));

  if (input.requireFinalizedGraph && deps.length === 0) {
    throw new AuthoritativeIssuanceError(
      "evidence_commitment_incomplete",
      "evidence_commitment_incomplete",
    );
  }

  return buildEvidenceCommitment(entries);
}

export async function buildAuthoritativeV11IssuanceFields(input: {
  receiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  decisionContext: DecisionReceiptContext;
  applicationId: string | null | undefined;
  pendingEvidenceFinalization: boolean;
  externalAnchorReference: string | null | undefined;
  env?: Record<string, string | undefined>;
}): Promise<{
  application_binding_ref: string | null;
  evidence_commitment: EvidenceCommitmentV1;
  anchor_reference: string | null;
}> {
  if (
    input.externalAnchorReference
    && !input.externalAnchorReference.startsWith("abraxas.receipt.v1_1.sidecar:")
  ) {
    throw new AuthoritativeIssuanceError("v11_anchor_sidecar_conflict", "v11_anchor_sidecar_conflict");
  }

  const application_binding_ref = await resolveAuthoritativeApplicationBindingRef({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    decisionContext: input.decisionContext,
    applicationId: input.applicationId,
    env: input.env,
  });

  const evidence_commitment = input.pendingEvidenceFinalization
    ? buildEvidenceCommitment([])
    : await buildAuthoritativeEvidenceCommitment({
        receiptId: input.receiptId,
        requireFinalizedGraph: false,
        env: input.env,
      });

  const anchor_reference = encodeReceiptV11Sidecar({
    application_binding_ref,
    evidence_commitment,
  });

  return { application_binding_ref, evidence_commitment, anchor_reference };
}
