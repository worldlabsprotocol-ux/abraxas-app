// FILE: lib/cielo/availability.ts
// Merged availability: Airbnb iCal blocks + Abraxas pending/confirmed stays.

import { createClient } from "@supabase/supabase-js";
import { getCieloBlockedDates, type BlockedDate } from "@/lib/icalSync";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface CieloAvailability {
  blocked: BlockedDate[];
  sources: {
    airbnb: number;
    abraxas: number;
  };
  ical_connected: boolean;
}

async function getAbraxasBlockedDates(): Promise<BlockedDate[]> {
  if (!SB_URL || !SB_KEY) return [];
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("stay_requests")
    .select("check_in, check_out")
    .in("status", ["pending", "confirmed", "authorized", "captured"]);

  return (data ?? []).map(row => ({
    start: row.check_in,
    end: row.check_out,
  }));
}

export async function getCieloAvailability(): Promise<CieloAvailability> {
  let airbnbBlocked: BlockedDate[] = [];
  let icalConnected = true;

  try {
    airbnbBlocked = await getCieloBlockedDates();
  } catch {
    icalConnected = false;
  }

  const abraxasBlocked = await getAbraxasBlockedDates();
  const blocked = [...airbnbBlocked, ...abraxasBlocked];

  return {
    blocked,
    sources: {
      airbnb: airbnbBlocked.length,
      abraxas: abraxasBlocked.length,
    },
    ical_connected: icalConnected,
  };
}
