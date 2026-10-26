// FILE: lib/persistence/boundary/verticalSlice/evidenceIntegrityWrite.server.ts
import "server-only";

import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import type { InternalReusableFact } from "@/lib/passport/reusableEligibility/contract";
import { loadSourceReceiptRow } from "@/lib/passport/reusableEligibility/invalidation";
import { getSovereignStagingPgPool } from "../sovereignStagingPg";
import { assertSovereignStagingWriteAllowed } from "../isolationGuard";
import { querySovereignStagingPg } from "../sovereignStagingPg";

export type MirrorReuseEvidenceResult =
  | { mirrored: true }
  | { mirrored: false; reason: "sovereign_pg_unconfigured" }
  | { mirrored: false; reason: "source_unavailable" };

function mapReceiptStatus(status: string): "active" | "revoked" | "expired" {
  if (status === "revoked") return "revoked";
  if (status === "expired") return "expired";
  return "active";
}

export async function mirrorReuseEvidenceIntegrityOnSovereignPg(input: {
  derivedReceiptId: string;
  fact: InternalReusableFact;
  derivedClaimRefs: EvaluatedClaimRef[];
  env?: Record<string, string | undefined>;
}): Promise<MirrorReuseEvidenceResult> {
  const env = input.env ?? process.env;
  if (!getSovereignStagingPgPool(env)) {
    return { mirrored: false, reason: "sovereign_pg_unconfigured" };
  }
  assertSovereignStagingWriteAllowed(env);

  const sourceRow = await loadSourceReceiptRow(input.fact.source_receipt_id);
  if (!sourceRow) {
    return { mirrored: false, reason: "source_unavailable" };
  }

  const sourceStatus = mapReceiptStatus(String(sourceRow.status ?? "active"));
  const sourceExpires = (sourceRow.expires_at as string | null) ?? input.fact.expires_at;

  await querySovereignStagingPg(
    `insert into public.sovereign_evidence_sources (source_credential_id, status, expires_at, revoked_at)
     values ($1, $2, $3, $4)
     on conflict (source_credential_id) do update set
       status = excluded.status,
       expires_at = excluded.expires_at,
       revoked_at = excluded.revoked_at`,
    [
      input.fact.source_receipt_id,
      sourceStatus,
      sourceExpires,
      sourceRow.revoked_at ?? null,
    ],
    env,
  );

  const depWrite = await querySovereignStagingPg(
    `insert into public.sovereign_receipt_evidence_dependencies (receipt_id, source_credential_id, dependency_type)
     values ($1, $2, 'source_receipt')
     on conflict (receipt_id, source_credential_id) do update set dependency_type = excluded.dependency_type`,
    [input.derivedReceiptId, input.fact.source_receipt_id],
    env,
  );
  if ("error" in depWrite) {
    throw new Error("sovereign_evidence_dependency_write_failed");
  }

  for (const ref of input.derivedClaimRefs) {
    await querySovereignStagingPg(
      `insert into public.sovereign_claim_status (claim_id, status, expires_at)
       values ($1, 'active', $2)
       on conflict (claim_id) do update set
         status = excluded.status,
         expires_at = excluded.expires_at`,
      [ref.claim_id, ref.expires_at ?? input.fact.expires_at],
      env,
    );
  }

  return { mirrored: true };
}
