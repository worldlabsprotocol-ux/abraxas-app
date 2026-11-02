// FILE: lib/passport/passportRequestInbox.ts
// Holder-safe inbox for partner requests already addressed to this Passport.

import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import { getPartnerPolicy } from "@/lib/policy/getPolicy";
import { getVerificationRequestPreview } from "@/lib/verification/requestsService";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";

export interface PassportRequestInboxItem {
  request_ref: string;
  partner_label: string;
  request_title: string;
  purpose: string;
  shared_result: string;
  received_at: string;
  expires_at: string;
  continue_href: string;
}

interface InboxSourceRow {
  id: string;
  partner_id: string;
  policy_id: string;
  requested_action: string | null;
  created_at: string;
  expires_at: string;
}

export function projectPassportRequestInboxItem(input: {
  row: InboxSourceRow;
  policyName: string | null;
  sharedResult: string | null;
}): PassportRequestInboxItem {
  const purpose = input.row.requested_action?.trim()
    ? input.row.requested_action.replace(/_/g, " ")
    : "Confirm eligibility";

  return {
    request_ref: `request:${input.row.id}`,
    partner_label: resolvePartnerDisplayName(input.row.partner_id),
    request_title: input.policyName?.trim() || "Passport verification request",
    purpose,
    shared_result: input.sharedResult?.trim() || "Eligibility result",
    received_at: input.row.created_at,
    expires_at: input.row.expires_at,
    continue_href: `/partner/continue?verify_request=${encodeURIComponent(input.row.id)}`,
  };
}

export async function listPassportRequestInbox(
  subjectId: string,
): Promise<PassportRequestInboxItem[]> {
  if (!isChainNeutralHolderSubjectId(subjectId)) throw new Error("canonical_holder_required");
  if (persistenceUsesDirectPostgres()) {
    const { rows } = await queryAbraxasPg<InboxSourceRow & { policy_name: string }>(
      `select r.id::text, r.partner_id, r.policy_id, r.requested_action,
              r.created_at::text, r.expires_at::text, p.name as policy_name
       from public.verification_requests r
       join public.partner_policies p on p.id = r.policy_id and p.partner_id = r.partner_id
         and p.version = r.policy_version
       where r.subject_id = $1 and r.status = 'pending' and r.expires_at > now()
       order by r.created_at desc limit 10`,
      [subjectId],
    );
    return rows.map((row) => {
      const pack = inferPolicyPackFromPolicyId(row.policy_id);
      const disclosure = pack ? resolveDisclosureProfile(pack.id) : null;
      return projectPassportRequestInboxItem({
        row,
        policyName: row.policy_name,
        sharedResult: disclosure?.ok ? disclosure.profile.result_category : null,
      });
    });
  }
  const now = new Date().toISOString();
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("verification_requests")
    .select("id,partner_id,policy_id,requested_action,created_at,expires_at")
    .eq("subject_id", subjectId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error("request_inbox_unavailable");

  const items = await Promise.all((data ?? []).map(async raw => {
    const row = raw as InboxSourceRow;
    const [policy, preview] = await Promise.all([
      getPartnerPolicy(row.policy_id),
      getVerificationRequestPreview(row.id, subjectId),
    ]);
    return projectPassportRequestInboxItem({
      row,
      policyName: policy?.name ?? null,
      sharedResult: preview?.shared_result_category ?? null,
    });
  }));

  return items;
}
