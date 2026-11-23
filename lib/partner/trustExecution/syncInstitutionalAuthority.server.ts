import "server-only";

import { querySovereignStagingPg, withSovereignStagingPgTransaction } from "@/lib/persistence/boundary/sovereignStagingPg.runtime";
import {
  inspectInstitutionalAuthorityBinding,
  type InstitutionalAuthorityCode,
  type InstitutionalAuthorityRecord,
} from "./institutionalAuthorityBinding";

type BoundRow = {
  id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  status: string;
  authority_source_revision: string | null;
};

/** Read by application ID, so a row owned by another tenant is visible as a conflict. */
export async function readInstitutionalAuthorityBinding(applicationId: string): Promise<
  (Omit<InstitutionalAuthorityRecord, "sourceRevision"> & { sourceRevision: string | null }) | null
> {
  const result = await querySovereignStagingPg<BoundRow>(
    `select id, partner_id, policy_id, policy_version, status,
            authority_source_revision::text as authority_source_revision
       from public.partner_launchpad_applications where id = $1::uuid limit 1`,
    [applicationId],
  );
  if ("error" in result) throw new Error("institutional_authority_store_unavailable");
  const row = result.rows[0];
  return row ? {
    applicationId: row.id, partnerId: row.partner_id, policyId: row.policy_id,
    policyVersion: row.policy_version, status: row.status,
    sourceRevision: row.authority_source_revision, environment: "sandbox",
  } : null;
}

/** Bind only an already authorized Launchpad source. Never replace conflicting authority. */
export async function syncInstitutionalAuthority(input: {
  authorizedApplicationId: string;
  source: InstitutionalAuthorityRecord | null;
}): Promise<{ ok: true } | { ok: false; code: InstitutionalAuthorityCode | "institutional_authority_store_unavailable" }> {
  const initial = inspectInstitutionalAuthorityBinding({ ...input, sovereign: null });
  if ("code" in initial) return { ok: false, code: initial.code };
  const source = initial.binding;
  const result = await withSovereignStagingPgTransaction(async (client) => {
    // The source may be in this same database or in a separate Launchpad store.
    // A conflicting row is never overwritten, even if it has no revision yet.
    await client.query(
      `insert into public.partner_launchpad_applications
         (id, partner_id, policy_id, policy_version, status, authority_source_revision)
       values ($1::uuid, $2, $3, $4, $5, $6::timestamptz)
       on conflict (id) do nothing`,
      [source.applicationId, source.partnerId, source.policyId, source.policyVersion,
        source.status, source.sourceRevision],
    );
    const loaded = await client.query<BoundRow>(
      `select id, partner_id, policy_id, policy_version, status,
              authority_source_revision::text as authority_source_revision
         from public.partner_launchpad_applications
        where id = $1::uuid for update`,
      [source.applicationId],
    );
    const row = loaded.rows[0];
    if (!row) return { ok: false as const, code: "institutional_authority_missing" as const };
    const inspection = inspectInstitutionalAuthorityBinding({
      authorizedApplicationId: source.applicationId,
      source,
      sovereign: {
        applicationId: row.id, partnerId: row.partner_id, policyId: row.policy_id,
        policyVersion: row.policy_version, status: row.status,
        sourceRevision: row.authority_source_revision, environment: "sandbox",
      },
    });
    if (inspection.status === "already_bound") return { ok: true as const };
    if ("code" in inspection) return { ok: false as const, code: inspection.code };
    await client.query(
      `update public.partner_launchpad_applications
          set authority_source_revision = $2::timestamptz
        where id = $1::uuid and authority_source_revision is null`,
      [source.applicationId, source.sourceRevision],
    );
    return { ok: true as const };
  });
  return result.ok ? result.value : { ok: false, code: "institutional_authority_store_unavailable" };
}
