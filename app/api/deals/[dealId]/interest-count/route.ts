// FILE: app/api/deals/[dealId]/interest-count/route.ts
// Real count of how many people have already expressed interest in
// this deal, pulled from the actual submissions table, not a
// fabricated number. The safe translation of a sentiment/prediction-
// market signal: real social proof, no wagering, nothing speculative.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: { dealId: string } }) {
  const { count } = await supabase
    .from("investment_interest")
    .select("*", { count: "exact", head: true })
    .eq("asset_id", params.dealId);

  return NextResponse.json({ count: count ?? 0 });
}
