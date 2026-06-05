// FILE: lib/supabase/client.ts
// Browser-side Supabase client. Safe to import in any "use client" component.
// Returns null if env vars aren't configured — components fall back to
// localStorage so the demo never breaks.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (!URL || !KEY) {
    if (typeof window !== "undefined") {
      console.warn("[Supabase] env vars missing — falling back to localStorage");
    }
    return null;
  }
  _client = createClient(URL, KEY, {
    auth: { persistSession: false },
  });
  return _client;
}

// Types for tokenization_requests table
export interface TokenizationRequest {
  id?:              string;
  created_at?:      string;
  updated_at?:      string;
  business_name:    string;
  contact_email?:   string | null;
  contact_x?:       string | null;
  sending_wallet?:  string | null;
  tier:             "starter" | "growth" | "enterprise";
  amount_usdc:      number;
  tx_signature?:    string | null;
  status:           "pending_payment" | "paid" | "in_pipeline" | "completed" | "cancelled";
  notes?:           string | null;
  asset_id?:        string | null;
}

// LOCAL FALLBACK — same shape, persisted in localStorage when Supabase unavailable.
// Production should always have Supabase configured.
const LS_KEY = "abraxas_tokenization_requests_v1";
function lsRead(): TokenizationRequest[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function lsWrite(rows: TokenizationRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}
function lsId() {
  return "local-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Unified API — uses Supabase if available, localStorage otherwise.
export const tokenizationRequests = {
  async insert(req: Omit<TokenizationRequest, "id"|"created_at"|"updated_at">):
      Promise<{ id: string; source: "supabase"|"local" }> {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from("tokenization_requests")
        .insert(req).select("id").single();
      if (error) throw new Error(error.message);
      return { id: data.id, source: "supabase" };
    }
    const row: TokenizationRequest = {
      ...req,
      id: lsId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const all = lsRead(); all.push(row); lsWrite(all);
    return { id: row.id!, source: "local" };
  },

  async confirmPayment(id: string, txSignature: string): Promise<void> {
    const sb = getSupabase();
    if (sb && !id.startsWith("local-")) {
      const { error } = await sb
        .from("tokenization_requests")
        .update({ tx_signature: txSignature, status: "paid" })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }
    const all = lsRead();
    const i = all.findIndex(r => r.id === id);
    if (i !== -1) {
      all[i].tx_signature = txSignature;
      all[i].status = "paid";
      all[i].updated_at = new Date().toISOString();
      lsWrite(all);
    }
  },

  // Marks payment-sent without a signature (user said they sent it but didn't paste sig)
  async markPaymentSent(id: string): Promise<void> {
    return this.confirmPayment(id, "(no signature provided)");
  },
};
