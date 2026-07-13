// FILE: lib/portal/ownerApplicationStore.ts
// Shared read/write for external asset applications (owner portal).

import { createClient } from "@supabase/supabase-js";
import type { OwnerApplicationFields } from "./ownerJourney";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const SELECT_FIELDS =
  "id, status, asset_name, asset_class, jurisdiction, evidence_scope, contact_email, contact_wallet, named_reviewer, review_signed_at, public_verify_slug, created_at, updated_at, linked_wallet, wallet_linked_at, deal_status, settlement_amount_usdc, settlement_tx_digest, settlement_verified_at, deal_ready_at, is_demo_sample";

export async function fetchOwnerApplication(
  applicationId: string,
  email: string,
): Promise<OwnerApplicationFields | null> {
  if (!SB_URL || !SB_KEY || applicationId.startsWith("local-")) return null;

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("external_asset_applications")
    .select(SELECT_FIELDS)
    .eq("id", applicationId)
    .maybeSingle();

  if (!data) return null;
  if (String(data.contact_email ?? "").trim().toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }
  return data as OwnerApplicationFields;
}

export async function linkWalletToApplication(
  applicationId: string,
  email: string,
  wallet: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!SB_URL || !SB_KEY) {
    return { ok: false, error: "Database not configured" };
  }

  const row = await fetchOwnerApplication(applicationId, email);
  if (!row) return { ok: false, error: "Application not found" };

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { error } = await sb
    .from("external_asset_applications")
    .update({
      linked_wallet: wallet.trim(),
      wallet_linked_at: new Date().toISOString(),
      contact_wallet: wallet.trim(),
      deal_status: row.deal_status === "intake" ? "review" : row.deal_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function captureOwnerSettlement(
  applicationId: string,
  txDigest: string,
  amountHuman: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!SB_URL || !SB_KEY) {
    return { ok: false, error: "Database not configured" };
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { error } = await sb
    .from("external_asset_applications")
    .update({
      settlement_tx_digest: txDigest,
      settlement_verified_at: new Date().toISOString(),
      deal_status: "settled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };

  void amountHuman;
  return { ok: true };
}

export { SELECT_FIELDS };
