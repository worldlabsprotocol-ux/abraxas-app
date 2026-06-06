// FILE: lib/supabase/client.ts
// Browser-safe Supabase client. Returns null when env vars absent → localStorage fallback.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (!SB_URL || !SB_KEY) {
    if (typeof window !== "undefined")
      console.warn("[Abraxas] Supabase env vars missing — localStorage fallback active");
    return null;
  }
  _client = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  return _client;
}

export interface TokenizationRequest {
  id?:                  string;
  created_at?:          string;
  updated_at?:          string;
  business_name:        string;
  contact_email?:       string | null;
  contact_x?:           string | null;
  sending_wallet?:      string | null;
  tier:                 "starter" | "growth" | "enterprise";
  amount_usdc:          number;
  tx_signature?:        string | null;
  status:               "pending_payment" | "paid" | "in_pipeline" | "completed" | "cancelled";
  notes?:               string | null;
  asset_id?:            string | null;
  // Wyoming LLC extended fields (added in migration 003)
  estimated_valuation?: string | null;
  description?:         string | null;
  jurisdiction?:        string | null;
  asset_type?:          string | null;
  lifecycle_state?:     string | null;
}

// ── Local fallback ────────────────────────────────────────────────────────────
const LS_KEY = "abraxas_tok_req_v1";
function lsRead(): TokenizationRequest[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function lsWrite(rows: TokenizationRequest[]) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(rows));
}
function lsId() { return "local-" + Math.random().toString(36).slice(2,10); }

// ── Public API ────────────────────────────────────────────────────────────────
export const tokenizationRequests = {

  async insert(req: Omit<TokenizationRequest,"id"|"created_at"|"updated_at">)
    : Promise<{ id: string; source: "supabase" | "local" }> {

    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("tokenization_requests")
        .insert(req)
        .select("id")
        .single();
      if (error) {
        // Log the Supabase error but fall through to localStorage so the form never breaks
        console.error("[Abraxas] Supabase insert failed:", error.message, error.code);
        // Re-throw only for non-RLS errors so callers can handle them
        if (error.code !== "42501") throw new Error(error.message);
        console.warn("[Abraxas] RLS blocked insert — using localStorage fallback");
        // Fall through to localStorage below
      } else {
        return { id: data.id, source: "supabase" };
      }
    }

    // localStorage path
    const row: TokenizationRequest = {
      ...req,
      id: lsId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const all = lsRead(); all.push(row); lsWrite(all);
    return { id: row.id!, source: "local" };
  },

  async confirmPayment(id: string, txSig: string): Promise<void> {
    const sb = getSupabase();
    if (sb && !id.startsWith("local-")) {
      const { error } = await sb
        .from("tokenization_requests")
        .update({ tx_signature: txSig, status: "paid" })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }
    const all = lsRead();
    const i = all.findIndex(r => r.id === id);
    if (i !== -1) { all[i].tx_signature = txSig; all[i].status = "paid"; lsWrite(all); }
  },

  async markPaymentSent(id: string): Promise<void> {
    return this.confirmPayment(id, "(no signature provided)");
  },
};
