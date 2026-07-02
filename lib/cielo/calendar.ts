// FILE: lib/cielo/calendar.ts
// Abraxas Protocol Calendar — source of truth for Cielo crypto bookings.
// No host iCal required. Operator blocks + booking holds live here.

import { createClient } from "@supabase/supabase-js";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";
import type { BlockedDate, CalendarBlockSource, CieloAvailability } from "@/lib/cielo/types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function sb() {
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

function rowToBlock(row: {
  start_date: string;
  end_date: string;
  source: string;
  booking_id: string | null;
  note: string | null;
}): BlockedDate {
  return {
    start: row.start_date,
    end: row.end_date,
    source: row.source as CalendarBlockSource,
    booking_id: row.booking_id,
    note: row.note,
  };
}

/** Read all active calendar blocks from Abraxas DB. */
export async function getProtocolCalendarBlocks(): Promise<BlockedDate[]> {
  if (!SB_URL || !SB_KEY) return [];

  const { data } = await sb()
    .from("cielo_calendar_blocks")
    .select("start_date, end_date, source, booking_id, note")
    .order("start_date", { ascending: true });

  if (data?.length) {
    return data.map(rowToBlock);
  }

  // Fallback: derive from stay_requests if calendar table empty / not migrated yet
  const { data: stays } = await sb()
    .from("stay_requests")
    .select("check_in, check_out, booking_id, status")
    .in("status", ["pending", "confirmed", "authorized", "captured"]);

  return (stays ?? []).map(s => ({
    start: s.check_in,
    end: s.check_out,
    source: s.status === "pending" ? "abraxas_pending" : "abraxas_confirmed",
    booking_id: s.booking_id,
    note: null,
  }));
}

export async function getCieloAvailability(): Promise<CieloAvailability> {
  const blocked = await getProtocolCalendarBlocks();

  const pending = blocked.filter(b => b.source === "abraxas_pending").length;
  const confirmed = blocked.filter(b =>
    b.source === "abraxas_confirmed" || b.source === "abraxas_pending",
  ).length;
  const operator = blocked.filter(b => b.source === "operator" || b.source === "maintenance").length;

  let lastAttested: string | null = null;
  if (SB_URL && SB_KEY) {
    const { data } = await sb()
      .from("cielo_calendar_blocks")
      .select("created_at")
      .eq("source", "operator")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastAttested = data?.created_at ?? null;
  }

  return {
    blocked,
    calendar: "abraxas_protocol",
    sources: {
      pending_bookings: pending,
      confirmed_bookings: confirmed,
      operator_blocks: operator,
      total_nights_blocked: blocked.length,
    },
    airbnb_listing_url: CIELO_AIRBNB_URL,
    last_attested_at: lastAttested,
  };
}

/** Reserve dates when a guest submits a booking request. */
export async function holdDatesForBooking(
  bookingId: string,
  checkIn: string,
  checkOut: string,
): Promise<void> {
  if (!SB_URL || !SB_KEY) return;

  await sb().from("cielo_calendar_blocks").insert({
    start_date: checkIn,
    end_date: checkOut,
    source: "abraxas_pending",
    booking_id: bookingId,
    note: "Auto-hold on Abraxas booking request",
  });
}

/** Promote a pending hold to confirmed (after operator approval). */
export async function confirmBookingHold(bookingId: string): Promise<void> {
  if (!SB_URL || !SB_KEY) return;

  await sb()
    .from("cielo_calendar_blocks")
    .update({ source: "abraxas_confirmed", note: "Confirmed Abraxas stay" })
    .eq("booking_id", bookingId);
}

/** Release hold if booking cancelled or declined. */
export async function releaseBookingHold(bookingId: string): Promise<void> {
  if (!SB_URL || !SB_KEY) return;
  await sb().from("cielo_calendar_blocks").delete().eq("booking_id", bookingId);
}

/** Operator manually blocks dates (e.g. after checking public Airbnb listing). */
export async function addOperatorBlock(
  startDate: string,
  endDate: string,
  note: string,
  createdBy = "operator",
): Promise<void> {
  if (!SB_URL || !SB_KEY) return;

  await sb().from("cielo_calendar_blocks").insert({
    start_date: startDate,
    end_date: endDate,
    source: "operator",
    booking_id: null,
    note,
    created_by: createdBy,
  });
}

export async function removeBlockById(id: string): Promise<void> {
  if (!SB_URL || !SB_KEY) return;
  await sb().from("cielo_calendar_blocks").delete().eq("id", id);
}

export async function listCalendarBlocks() {
  if (!SB_URL || !SB_KEY) return [];
  const { data } = await sb()
    .from("cielo_calendar_blocks")
    .select("*")
    .order("start_date", { ascending: true });
  return data ?? [];
}

export async function listStayRequests(limit = 50) {
  if (!SB_URL || !SB_KEY) return [];
  const { data } = await sb()
    .from("stay_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
