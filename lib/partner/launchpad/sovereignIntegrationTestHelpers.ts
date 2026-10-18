/** Shared helpers for sovereign Launchpad PostgreSQL integration tests. */

export function sandboxPartnerIdForAccount(accountId: string): string {
  const suffix = accountId.replace(/^abx_ac_/, "").slice(0, 12);
  return `dev-${suffix}`;
}

export async function purgeSovereignLaunchpadPartnerData(
  admin: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  partnerId: string,
  accountId: string,
): Promise<void> {
  await admin.query(
    "delete from public.partner_launchpad_signed_receipts where partner_id = $1",
    [partnerId],
  );
  await admin.query(
    "delete from public.partner_launchpad_verification_requests where partner_id = $1",
    [partnerId],
  );
  await admin.query(
    "delete from public.partner_launchpad_usage_events where partner_id = $1",
    [partnerId],
  );
  await admin.query(
    "delete from public.abraxas_sandbox_enrollments where account_id = $1",
    [accountId],
  );
  await admin.query(
    "delete from public.abraxas_account_partner_memberships where account_id = $1",
    [accountId],
  );
  await admin.query(
    "delete from public.partner_launchpad_activity where partner_id = $1",
    [partnerId],
  );
  await admin.query(
    "delete from public.partner_launchpad_applications where partner_id = $1",
    [partnerId],
  );
  await admin.query(
    "delete from public.partner_api_keys where partner_id = $1",
    [partnerId],
  );
  await admin.query(
    "delete from public.partner_policies where partner_id = $1",
    [partnerId],
  );
  await admin.query("delete from public.partners where partner_id = $1", [partnerId]);
  await admin.query("delete from public.abraxas_accounts where account_id = $1", [accountId]);
}
