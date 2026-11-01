// FILE: lib/decisionReceipts/v1_1_0/authoritativeIssuance.server.ts
import "server-only";

import {
  blindEvidenceRef,
  buildEvidenceCommitment,
  deriveApplicationBindingRef,
  type EvidenceCommitmentEntryV1,
  type EvidenceCommitmentV1,
} from "@/lib/decisionReceipts/schema/v1_1_0.server";
import { deriveApplicationScopeFromAuthoritativeFacts } from "@/lib/decisionReceipts/currentValidity/applicationScopeContract";
import { getReceiptEvidenceDependencies } from "@/lib/decisionReceipts/evidenceDependencies";
import type { DecisionReceiptContext } from "@/lib/decisionReceipts/types";
import {
  assertExternalAnchorCompatibleWithV11Sidecar,
  encodeReceiptV11Sidecar,
  V1_1_SIDECAR_SCHEMA,
  type ReceiptV11IssuancePhase,
} from "@/lib/decisionReceipts/v1_1_0/sidecar";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";

export class AuthoritativeIssuanceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "application_binding_secret_missing"
      | "application_scope_unavailable"
      | "application_unauthorized"
      | "application_scope_required"
      | "application_mismatch"
      | "evidence_commitment_incomplete"
      | "v11_anchor_sidecar_conflict"
      | "sidecar_malformed",
  ) {
    super(message);
    this.name = "AuthoritativeIssuanceError";
  }
}

export class ReceiptCryptographicImmutabilityError extends Error {
  constructor(
    message: string,
    readonly code:
      | "receipt_not_pending"
      | "receipt_immutability_violation"
      | "finalization_race",
  ) {
    super(message);
    this.name = "ReceiptCryptographicImmutabilityError";
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

export async function resolveAuthoritativeApplicationIdForIssuance(input: {
  verificationDecisionId: string;
  partnerId: string;
  callerApplicationId?: string | null;
  transaction?: { query: (sql: string, params: unknown[]) => Promise<{
    rows: Array<Record<string, unknown>>;
  }> };
}): Promise<{ applicationId: string | null; applicationScopeRequired: boolean }> {
  let authoritativeApplicationId: string | null = null;
  if (persistenceUsesDirectPostgres()) {
    const sql = `select r.launchpad_application_id
       from public.verification_decisions d
       join public.verification_requests r on r.id = d.request_id
       where d.id = $1::uuid and d.partner_id = $2 limit 1`;
    const params = [input.verificationDecisionId, input.partnerId];
    const result = input.transaction
      ? await input.transaction.query(sql, params)
      : await queryAbraxasPg<{ launchpad_application_id: string | null }>(sql, params);
    authoritativeApplicationId = typeof result.rows[0]?.launchpad_application_id === "string"
      ? result.rows[0].launchpad_application_id : null;
  } else {
    const sb = requireSupabaseAdmin();
    const { data: decision } = await sb
      .from("verification_decisions")
      .select("request_id")
      .eq("id", input.verificationDecisionId)
      .maybeSingle();
    if (decision?.request_id) {
      const { data: request } = await sb
        .from("verification_requests")
        .select("launchpad_application_id")
        .eq("id", decision.request_id as string)
        .maybeSingle();
      authoritativeApplicationId = (request?.launchpad_application_id as string | null) ?? null;
    }
  }

  if (authoritativeApplicationId) {
    if (
      input.callerApplicationId
      && input.callerApplicationId !== authoritativeApplicationId
    ) {
      throw new AuthoritativeIssuanceError("application_mismatch", "application_mismatch");
    }
    return { applicationId: authoritativeApplicationId, applicationScopeRequired: true };
  }

  if (input.callerApplicationId) {
    return { applicationId: input.callerApplicationId, applicationScopeRequired: true };
  }

  return { applicationId: null, applicationScopeRequired: false };
}

export async function resolveAuthoritativeApplicationBindingRef(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  decisionContext: DecisionReceiptContext;
  applicationId: string | null | undefined;
  applicationScopeRequired: boolean;
  env?: Record<string, string | undefined>;
}): Promise<string | null> {
  if (!input.applicationId) {
    if (input.applicationScopeRequired) {
      throw new AuthoritativeIssuanceError("application_scope_required", "application_scope_required");
    }
    return null;
  }

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

export async function buildAuthoritativeEvidenceCommitmentAndManifest(input: {
  receiptId: string;
  requireFinalizedGraph: boolean;
  env?: Record<string, string | undefined>;
  transaction?: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> };
}): Promise<{ commitment: EvidenceCommitmentV1; manifest: EvidenceCommitmentEntryV1[] }> {
  const rawDeps = input.transaction && persistenceUsesDirectPostgres()
    ? (await input.transaction.query(
        `select dependency_type, fact_id, source_credential_id
         from public.decision_receipt_evidence_dependencies
         where receipt_id = $1 order by created_at asc, id asc`,
        [input.receiptId],
      )).rows
    : await getReceiptEvidenceDependencies(input.receiptId);
  const deps = rawDeps.map((row) => {
    if (row.dependency_type !== "reusable_fact" && row.dependency_type !== "source_receipt"
      && row.dependency_type !== "derived_from") {
      throw new AuthoritativeIssuanceError("evidence_commitment_incomplete", "evidence_commitment_incomplete");
    }
    return {
      dependency_type: row.dependency_type as EvidenceCommitmentEntryV1["dependency_type"],
      fact_id: typeof row.fact_id === "string" ? row.fact_id : null,
      source_credential_id: typeof row.source_credential_id === "string" ? row.source_credential_id : null,
    };
  });
  const blindingKey = loadEvidenceBlindingKey(input.env ?? process.env);

  const manifest: EvidenceCommitmentEntryV1[] = deps.map((row) => ({
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

  return {
    commitment: buildEvidenceCommitment(manifest),
    manifest,
  };
}

export async function buildAuthoritativeV11IssuanceFields(input: {
  receiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  decisionContext: DecisionReceiptContext;
  applicationId: string | null | undefined;
  applicationScopeRequired: boolean;
  issuancePhase: ReceiptV11IssuancePhase;
  externalAnchorReference: string | null | undefined;
  env?: Record<string, string | undefined>;
}): Promise<{
  application_binding_ref: string | null;
  evidence_commitment: EvidenceCommitmentV1;
  evidence_commitment_manifest: EvidenceCommitmentEntryV1[] | null;
  anchor_reference: string;
}> {
  const anchorOk = assertExternalAnchorCompatibleWithV11Sidecar(input.externalAnchorReference);
  if (!anchorOk.ok) {
    throw new AuthoritativeIssuanceError(anchorOk.reason, anchorOk.reason);
  }

  const application_binding_ref = await resolveAuthoritativeApplicationBindingRef({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    decisionContext: input.decisionContext,
    applicationId: input.applicationId,
    applicationScopeRequired: input.applicationScopeRequired,
    env: input.env,
  });

  const pending = input.issuancePhase === "pending";
  const { commitment, manifest } = pending
    ? { commitment: buildEvidenceCommitment([]), manifest: [] as EvidenceCommitmentEntryV1[] }
    : await buildAuthoritativeEvidenceCommitmentAndManifest({
        receiptId: input.receiptId,
        requireFinalizedGraph: false,
        env: input.env,
      });

  const anchor_reference = encodeReceiptV11Sidecar({
    schema: V1_1_SIDECAR_SCHEMA,
    issuance_phase: input.issuancePhase,
    application_binding_ref,
    evidence_commitment: commitment,
    evidence_commitment_manifest: pending ? null : manifest,
  });

  return {
    application_binding_ref,
    evidence_commitment: commitment,
    evidence_commitment_manifest: pending ? null : manifest,
    anchor_reference,
  };
}
