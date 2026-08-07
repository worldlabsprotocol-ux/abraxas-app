// FILE: lib/partner/partnerMeteringReport.ts
// Partner usage aggregates — counts only, no PII, no pricing.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PARTNER_METERING_EVENT_TYPES } from "@/lib/partner/partnerMetering";
import { getPartnerEntitlements } from "@/lib/partner/partnerEntitlements";

const MAX_RANGE_DAYS = 366;
const DEFAULT_PAGE_SIZE = 31;
const MAX_PAGE_SIZE = 90;

export interface PartnerMeteringDateRange {
  from: string;
  to: string;
}

export interface PartnerMeteringDailyAggregate {
  date: string;
  partner_flow_receipt_issued: number;
  partner_api_call: number;
  total: number;
}

export interface PartnerMeteringMonthlyAggregate {
  month: string;
  partner_flow_receipt_issued: number;
  partner_api_call: number;
  total: number;
}

export interface PartnerMeteringReport {
  partner_id: string;
  range: PartnerMeteringDateRange;
  observe_only: boolean;
  enforcement_mode: string;
  plan_id: string;
  daily: PartnerMeteringDailyAggregate[];
  monthly: PartnerMeteringMonthlyAggregate[];
  totals: {
    partner_flow_receipt_issued: number;
    partner_api_call: number;
    total: number;
  };
  pagination: {
    limit: number;
    offset: number;
    returned_days: number;
  };
}

type MeteringRow = {
  event_type: string;
  occurred_at: string;
};

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function validatePartnerMeteringDateRange(input: {
  from?: string | null;
  to?: string | null;
}): { ok: true; range: PartnerMeteringDateRange } | { ok: false; error: string } {
  const toRaw = input.to?.trim();
  const fromRaw = input.from?.trim();

  const toDate = toRaw ? new Date(toRaw) : new Date();
  const fromDate = fromRaw ? new Date(fromRaw) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { ok: false, error: "invalid_date_range" };
  }

  if (fromDate > toDate) {
    return { ok: false, error: "from_after_to" };
  }

  const spanDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  if (spanDays > MAX_RANGE_DAYS) {
    return { ok: false, error: `range_exceeds_${MAX_RANGE_DAYS}_days` };
  }

  return {
    ok: true,
    range: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
  };
}

export function parsePartnerMeteringPagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10);
  const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
  return { limit, offset };
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function aggregateRows(rows: MeteringRow[]): {
  daily: PartnerMeteringDailyAggregate[];
  monthly: PartnerMeteringMonthlyAggregate[];
  totals: PartnerMeteringReport["totals"];
} {
  const dailyMap = new Map<string, PartnerMeteringDailyAggregate>();
  const monthlyMap = new Map<string, PartnerMeteringMonthlyAggregate>();
  const totals = {
    partner_flow_receipt_issued: 0,
    partner_api_call: 0,
    total: 0,
  };

  for (const row of rows) {
    const day = dateKey(row.occurred_at);
    const month = monthKey(row.occurred_at);
    const daily = dailyMap.get(day) ?? {
      date: day,
      partner_flow_receipt_issued: 0,
      partner_api_call: 0,
      total: 0,
    };
    const monthly = monthlyMap.get(month) ?? {
      month,
      partner_flow_receipt_issued: 0,
      partner_api_call: 0,
      total: 0,
    };

    if (row.event_type === PARTNER_METERING_EVENT_TYPES.partnerFlowReceiptIssued) {
      daily.partner_flow_receipt_issued += 1;
      monthly.partner_flow_receipt_issued += 1;
      totals.partner_flow_receipt_issued += 1;
    } else if (row.event_type === PARTNER_METERING_EVENT_TYPES.partnerApiCall) {
      daily.partner_api_call += 1;
      monthly.partner_api_call += 1;
      totals.partner_api_call += 1;
    }

    daily.total = daily.partner_flow_receipt_issued + daily.partner_api_call;
    monthly.total = monthly.partner_flow_receipt_issued + monthly.partner_api_call;
    totals.total += 1;

    dailyMap.set(day, daily);
    monthlyMap.set(month, monthly);
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return { daily, monthly, totals };
}

export async function buildPartnerMeteringReport(input: {
  partnerId: string;
  range: PartnerMeteringDateRange;
  limit?: number;
  offset?: number;
}): Promise<PartnerMeteringReport | null> {
  const client = sb();
  if (!client) return null;

  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const offset = input.offset ?? 0;

  const { data, error } = await client
    .from("partner_metering_events")
    .select("event_type, occurred_at")
    .eq("partner_id", input.partnerId)
    .gte("occurred_at", input.range.from)
    .lte("occurred_at", input.range.to)
    .order("occurred_at", { ascending: true });

  if (error) {
    console.warn("partner_metering_events query failed:", error.message);
    return null;
  }

  const entitlements = await getPartnerEntitlements(input.partnerId);
  const { daily, monthly, totals } = aggregateRows((data ?? []) as MeteringRow[]);
  const pagedDaily = daily.slice(offset, offset + limit);

  return {
    partner_id: input.partnerId,
    range: input.range,
    observe_only: true,
    enforcement_mode: entitlements.enforcementMode,
    plan_id: entitlements.planId,
    daily: pagedDaily,
    monthly,
    totals,
    pagination: {
      limit,
      offset,
      returned_days: pagedDaily.length,
    },
  };
}

export function partnerMeteringReportHasNoPii(report: PartnerMeteringReport): boolean {
  const text = JSON.stringify(report).toLowerCase();
  return !text.includes("@")
    && !text.includes("wallet")
    && !text.includes("jwt")
    && !text.includes("0x");
}
