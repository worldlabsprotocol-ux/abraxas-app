// FILE: lib/admin/operatorAttention.ts
// Aggregate operator attention counts — API failure must not become zero.

import { createClient } from "@supabase/supabase-js";
import { countPendingIdentityReviewSessions } from "@/lib/admin/identityReviewPendingCount";
import { PRIVACY_ACTIVE_STATUSES } from "@/lib/privacy/types";
import { listFailedWebhookDeliveries } from "@/lib/partner/webhooks/webhookDeadLetter";
import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";

export type AttentionSourceStatus = "ok" | "unavailable";

export interface OperatorAttentionSource {
  id: string;
  label: string;
  href: string;
  status: AttentionSourceStatus;
  count: number | null;
  error?: string;
}

export interface OperatorAttentionSnapshot {
  generated_at: string;
  sources: OperatorAttentionSource[];
  disclaimer: string;
}

const DISCLAIMER =
  "Counts reflect authoritative backend queues. Unavailable sources are shown separately — never as zero.";

function sbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function identityPendingSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "identity_reviews",
    label: "Identity reviews",
    href: "/admin/identity",
  };
  const sb = sbClient();
  if (!sb) {
    return { ...base, status: "unavailable", count: null, error: "Database not configured" };
  }
  const { data, error } = await sb
    .from("passport_documents")
    .select("id, capture_session_id, status")
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"])
    .limit(500);
  if (error) {
    return { ...base, status: "unavailable", count: null, error: error.message };
  }
  return { ...base, status: "ok", count: countPendingIdentityReviewSessions(data ?? []) };
}

async function productionReviewSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "production_review",
    label: "Production activation reviews",
    href: "/admin/production-review",
  };
  try {
    const sb = requireSupabaseAdmin();
    const { count, error } = await sb
      .from("partner_production_access_requests")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
    if (error) {
      return { ...base, status: "unavailable", count: null, error: error.message };
    }
    return { ...base, status: "ok", count: count ?? 0 };
  } catch (e) {
    const msg = e instanceof SupabaseAdminConfigurationError
      ? "Database not configured"
      : e instanceof Error ? e.message : "Queue unavailable";
    return { ...base, status: "unavailable", count: null, error: msg };
  }
}

async function bindingProductionSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "binding_production_review",
    label: "Binding production authorization",
    href: "/admin/production-review?tab=binding",
  };
  try {
    const sb = requireSupabaseAdmin();
    const { count, error } = await sb
      .from("partner_binding_production_access_requests")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
    if (error) {
      return { ...base, status: "unavailable", count: null, error: error.message };
    }
    return { ...base, status: "ok", count: count ?? 0 };
  } catch (e) {
    const msg = e instanceof SupabaseAdminConfigurationError
      ? "Database not configured"
      : e instanceof Error ? e.message : "Queue unavailable";
    return { ...base, status: "unavailable", count: null, error: msg };
  }
}

async function webhookFailuresSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "webhook_failures",
    label: "Failed webhook deliveries",
    href: "/admin/partners?tab=webhooks",
  };
  try {
    const deliveries = await listFailedWebhookDeliveries({ limit: 100 });
    return { ...base, status: "ok", count: deliveries.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook health unavailable";
    return { ...base, status: "unavailable", count: null, error: msg };
  }
}

async function privacyRequestsSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "privacy_requests",
    label: "Privacy requests",
    href: "/admin/privacy",
  };
  try {
    const sb = requireSupabaseAdmin();
    const { count, error } = await sb
      .from("privacy_requests")
      .select("id", { head: true, count: "exact" })
      .in("status", [...PRIVACY_ACTIVE_STATUSES]);
    if (error) {
      return { ...base, status: "unavailable", count: null, error: error.message };
    }
    return { ...base, status: "ok", count: count ?? 0 };
  } catch (e) {
    const msg = e instanceof SupabaseAdminConfigurationError
      ? "Database not configured"
      : e instanceof Error ? e.message : "Queue unavailable";
    return { ...base, status: "unavailable", count: null, error: msg };
  }
}

async function holderSupportSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "holder_support",
    label: "Holder support requests",
    href: "/admin/support",
  };
  const sb = sbClient();
  if (!sb) {
    return { ...base, status: "unavailable", count: null, error: "Database not configured" };
  }
  const { data, error } = await sb
    .from("contact_submissions")
    .select("category")
    .like("category", "passport-support:%")
    .limit(200);
  if (error) {
    return { ...base, status: "unavailable", count: null, error: error.message };
  }
  const open = (data ?? []).filter(row => {
    const cat = typeof row.category === "string" ? row.category : "";
    return !cat.endsWith(":resolved");
  }).length;
  return { ...base, status: "ok", count: open };
}

async function designPartnersSource(): Promise<OperatorAttentionSource> {
  const base = {
    id: "design_partners",
    label: "Design partner applications",
    href: "/admin/design-partners",
  };
  try {
    const sb = requireSupabaseAdmin();
    const { count, error } = await sb
      .from("design_partners")
      .select("id", { head: true, count: "exact" })
      .eq("status", "submitted");
    if (error) {
      return { ...base, status: "unavailable", count: null, error: error.message };
    }
    return { ...base, status: "ok", count: count ?? 0 };
  } catch (e) {
    const msg = e instanceof SupabaseAdminConfigurationError
      ? "Database not configured"
      : e instanceof Error ? e.message : "Queue unavailable";
    return { ...base, status: "unavailable", count: null, error: msg };
  }
}

export async function loadOperatorAttentionSnapshot(): Promise<OperatorAttentionSnapshot> {
  const sources = await Promise.all([
    identityPendingSource(),
    productionReviewSource(),
    bindingProductionSource(),
    webhookFailuresSource(),
    privacyRequestsSource(),
    holderSupportSource(),
    designPartnersSource(),
  ]);

  return {
    generated_at: new Date().toISOString(),
    sources,
    disclaimer: DISCLAIMER,
  };
}

export function attentionSourcesNeedingAction(snapshot: OperatorAttentionSnapshot): OperatorAttentionSource[] {
  return snapshot.sources.filter(source => source.status === "ok" && (source.count ?? 0) > 0);
}

export function attentionSourcesUnavailable(snapshot: OperatorAttentionSnapshot): OperatorAttentionSource[] {
  return snapshot.sources.filter(source => source.status === "unavailable");
}
