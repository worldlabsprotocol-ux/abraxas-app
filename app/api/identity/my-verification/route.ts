// FILE: app/api/identity/my-verification/route.ts
// Current user's identity submission — scoped to browser session wallet only.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireBrowserSession } from "@/lib/auth/browserSession";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const sui = normalizeSuiAddress(auth.session.suiAddress);
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: docs } = await sb
    .from("passport_documents")
    .select("id, created_at, status, legal_name, document_type, capture_session_id, reviewer_note, reviewed_at, reviewed_by")
    .eq("sui_address", sui)
    .eq("stamp_id", "identity")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!docs?.length) {
    return NextResponse.json({ has_submission: false, sui_address: sui });
  }

  const sessionId = docs.find(d => d.capture_session_id)?.capture_session_id as string | null;
  const latestStatus = docs[0]?.status as string;

  let biometric: Record<string, unknown> | null = null;
  if (sessionId) {
    const { data: assessment } = await sb
      .from("identity_biometric_assessments")
      .select("decision, reviewer_decision, engine_version, face_match_score, liveness_score, signals, analyzed_at, reviewed_at")
      .eq("capture_session_id", sessionId)
      .maybeSingle();
    biometric = assessment;
  }

  const { data: idv } = await sb
    .from("identity_verifications")
    .select("identity_verification_status, credential_status, error_message, credential_issued_at")
    .or(`wallet_address.eq.${sui},sui_address.eq.${sui}`)
    .maybeSingle();

  const submittedAt = docs
    .filter(d => d.document_type === "id_front")
    .map(d => d.created_at)
    .sort()
    .pop() ?? docs[0]?.created_at;

  const reviewedAt = docs.find(d => d.reviewed_at)?.reviewed_at ?? null;
  const reviewerNote = docs.find(d => d.reviewer_note)?.reviewer_note ?? idv?.error_message ?? null;

  let displayStatus = "submitted";
  if (latestStatus === "accepted" || idv?.identity_verification_status === "approved") {
    displayStatus = "approved";
  } else if (latestStatus === "rejected" || idv?.identity_verification_status === "declined") {
    displayStatus = "rejected";
  } else if (latestStatus === "resubmission_requested" || idv?.identity_verification_status === "requires_resubmission") {
    displayStatus = "resubmission_requested";
  } else if (["submitted", "under_review"].includes(latestStatus)) {
    displayStatus = "under_review";
  }

  return NextResponse.json({
    has_submission: true,
    sui_address: sui,
    capture_session_id: sessionId,
    legal_name: docs.find(d => d.legal_name)?.legal_name ?? null,
    status: displayStatus,
    submitted_at: submittedAt,
    reviewed_at: reviewedAt,
    reviewer_note: reviewerNote,
    engine_decision: biometric?.decision ?? null,
    reviewer_decision: biometric?.reviewer_decision ?? null,
    engine_version: biometric?.engine_version ?? null,
    biometric_signals: biometric?.signals ?? null,
    credential_status: idv?.credential_status ?? null,
    can_resubmit: displayStatus === "resubmission_requested" || displayStatus === "rejected",
  });
}
