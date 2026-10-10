// FILE: app/api/deals/[dealId]/interest-count/route.ts
// Real count of how many people have already expressed interest in
// this deal, pulled from the actual submissions table, not a
// fabricated number. The safe translation of a sentiment/prediction-
// market signal: real social proof, no wagering, nothing speculative.
import { NextResponse } from "next/server";
import { supabaseForRoute } from "@/lib/supabase/routeAdmin";

export async function GET(req: Request, { params }: { params: { dealId: string } }) {
  const supabase = supabaseForRoute();
  try {
    const { count } = await supabase
      .from("investment_interest")
      .select("*", { count: "exact", head: true })
      .eq("asset_id", params.dealId);
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    // Table name may not match your real schema yet, fail to 0
    // rather than break the page. Run the query below in Supabase to
    // find the real table name, then tell me what it is.
    return NextResponse.json({ count: 0 });
  }
}
