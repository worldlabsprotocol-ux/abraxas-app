// Historical hosted identity lookup only. New hosted requests use signed Solana holder sessions.

import { createClient } from "@supabase/supabase-js";

export const HOSTED_HOLDER_PROVIDER = "abraxas_hosted" as const;

export function isHostedHolderProvider(provider: string | null | undefined): boolean {
  return provider === HOSTED_HOLDER_PROVIDER;
}

/** Historical linkage only; never creates or authenticates a holder. */
export async function findHostedHolderBySuiAddress(
  address: string,
): Promise<{ provider: string; oauth_sub: string } | null> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!sbUrl || !sbKey || !/^0x[0-9a-fA-F]{1,64}$/.test(address)) return null;

  const normalized = `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const { data, error } = await sb.from("sui_zklogin_identities")
    .select("provider, oauth_sub").eq("sui_address", normalized).maybeSingle();
  if (error || !data) return null;
  return { provider: String(data.provider), oauth_sub: String(data.oauth_sub) };
}
