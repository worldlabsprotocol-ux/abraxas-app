import type { PartnerPolicy } from "@/lib/policy/types";
import { queryAbraxasPg } from "./pgPool";

export async function getPartnerPolicyDirect(policyId: string): Promise<PartnerPolicy | null> {
  const result = await queryAbraxasPg<PartnerPolicy>(
    `select * from public.partner_policies where id = $1 and status = 'active' limit 1`,
    [policyId],
  );
  return result.rows[0] ?? null;
}

export async function getVerificationRequestDirect(id: string): Promise<{
  partner_id: string;
  policy_id: string;
} | null> {
  const result = await queryAbraxasPg<{ partner_id: string; policy_id: string }>(
    `select partner_id, policy_id from public.verification_requests where id = $1 limit 1`,
    [id],
  );
  return result.rows[0] ?? null;
}
