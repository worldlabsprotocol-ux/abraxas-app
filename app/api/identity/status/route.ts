// FILE: app/api/identity/status/route.ts
// Checks BOTH paths to "earned" for the Identity stamp: a completed
// Veriff session, or a manually-uploaded document your team marked
// accepted in the passport_documents table. Either path counts, since
// Veriff isn't required, it's one option, not the only option.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // Path 1: Veriff
  const { data: veriffRow } = await supabase
    .from("identity_verifications")
    .select("status")
    .eq("user_email", email)
    .single();

  if (veriffRow?.status === "approved") {
    return NextResponse.json({ status: "approved", via: "veriff" });
  }

  // Path 2: manually uploaded document, accepted by your team
  const { data: docRow } = await supabase
    .from("passport_documents")
    .select("status")
    .eq("user_email", email)
    .eq("stamp_id", "identity")
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (docRow) {
    return NextResponse.json({ status: "approved", via: "manual_review" });
  }

  // Anything pending either way counts as in-review
  if (veriffRow?.status === "pending") {
    return NextResponse.json({ status: "pending", via: "veriff" });
  }

  const { data: pendingDoc } = await supabase
    .from("passport_documents")
    .select("status")
    .eq("user_email", email)
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"])
    .limit(1)
    .maybeSingle();

  if (pendingDoc) {
    return NextResponse.json({ status: "pending", via: "manual_review" });
  }

  return NextResponse.json({ status: "not_started" });
}
