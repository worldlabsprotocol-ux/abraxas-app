// FILE: app/api/passport/genesis/availability/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from("genesis_passport_counter")
    .select("next_seat, max_seats")
    .eq("id", 1)
    .single();

  if (!data) return NextResponse.json({ seatsRemaining: 0, maxSeats: 250 });

  const seatsRemaining = Math.max(0, data.max_seats - (data.next_seat - 1));
  return NextResponse.json({ seatsRemaining, maxSeats: data.max_seats });
}
