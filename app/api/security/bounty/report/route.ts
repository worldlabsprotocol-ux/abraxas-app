// FILE: app/api/security/bounty/report/route.ts
// Bug bounty pre-registration submission — persists + emails security@.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueAuthenticationProof } from "@/lib/authenticationProof/issue";
import { BUG_BOUNTY } from "@/lib/securityProgram";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const SEVERITIES = ["critical", "high", "medium", "low", "informational"] as const;

export async function POST(req: NextRequest) {
  if (process.env.SECURITY_BOUNTY_SUBMISSIONS === "false") {
    return NextResponse.json({ error: "Bounty submissions paused" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    severity?: string;
    description?: string;
    reproduction?: string;
    contact_email?: string;
  };

  const title = body.title?.trim();
  const description = body.description?.trim();
  const email = body.contact_email?.trim();
  const severity = body.severity?.toLowerCase() ?? "medium";

  if (!title || !description || !email?.includes("@")) {
    return NextResponse.json({ error: "title, description, and valid contact_email required" }, { status: 400 });
  }

  if (!SEVERITIES.includes(severity as typeof SEVERITIES[number])) {
    return NextResponse.json({ error: "invalid severity" }, { status: 400 });
  }

  let reportId: string | null = null;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.from("security_reports").insert({
      title,
      severity,
      description,
      reproduction: body.reproduction?.trim() ?? null,
      contact_email: email,
      status: "submitted",
    }).select("id").single();

    if (error) {
      console.error("[bounty/report]", error.message);
      return NextResponse.json({ error: "Could not save report" }, { status: 500 });
    }
    reportId = data.id as string;
  }

  const proof = reportId
    ? await issueAuthenticationProof({
        eventType: "security_report",
        recordId: reportId,
        recordPayload: { title, severity, description, report_id: reportId },
      })
    : null;

  if (SB_URL && SB_KEY && reportId && proof?.proof_id) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    await sb.from("security_reports").update({ proof_id: proof.proof_id }).eq("id", reportId);
  }

  return NextResponse.json({
    ok: true,
    report_id: reportId,
    phase: BUG_BOUNTY.phase,
    proof,
    message: "Report authenticated on-protocol. Do not publicly disclose until we acknowledge.",
  });
}
