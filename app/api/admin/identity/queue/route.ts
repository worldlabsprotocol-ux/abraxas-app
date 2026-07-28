// FILE: app/api/admin/identity/queue/route.ts
// Manual identity review queue — grouped Abraxas capture sessions.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/adminAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

interface DocRow {
  id: string;
  created_at: string;
  user_email: string;
  sui_address: string | null;
  file_name: string;
  storage_path: string;
  status: string;
  reviewer_note: string | null;
  document_type: string | null;
  capture_session_id: string | null;
  legal_name: string | null;
}

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  let query = sb
    .from("passport_documents")
    .select("id, created_at, user_email, sui_address, file_name, storage_path, status, reviewer_note, document_type, capture_session_id, legal_name")
    .eq("stamp_id", "identity")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status === "pending") {
    query = query.in("status", ["submitted", "under_review"]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as DocRow[];
  const grouped = new Map<string, DocRow & { documents: DocRow[] }>();

  for (const row of rows) {
    const key = row.capture_session_id ?? row.id;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...row, documents: [row] });
      continue;
    }
    existing.documents.push(row);
    if (row.document_type === "id_front") {
      grouped.set(key, { ...row, documents: existing.documents });
    }
  }

  const items = Array.from(grouped.values()).map(item => ({
    ...item,
    has_selfie: item.documents.some(d => d.document_type === "selfie"),
    has_id_front: item.documents.some(d => d.document_type === "id_front"),
    capture_complete: item.capture_session_id
      ? item.documents.some(d => d.document_type === "id_front") &&
        item.documents.some(d => d.document_type === "selfie")
      : true,
  }));

  const sessionIds = items
    .map(i => i.capture_session_id)
    .filter((id): id is string => Boolean(id));

  const biometricBySession = new Map<string, Record<string, unknown>>();
  if (sessionIds.length > 0) {
    const { data: assessments } = await sb
      .from("identity_biometric_assessments")
      .select("capture_session_id, face_match_score, liveness_score, document_quality_score, selfie_quality_score, decision, assurance_level, review_method, engine_version, reviewer_decision, reviewer_id, reviewed_at, signals")
      .in("capture_session_id", sessionIds);

    for (const row of assessments ?? []) {
      biometricBySession.set(row.capture_session_id as string, row);
    }
  }

  const withBiometric = items.map(item => ({
    ...item,
    biometric: item.capture_session_id
      ? biometricBySession.get(item.capture_session_id) ?? null
      : null,
  }));

  return NextResponse.json({ items: withBiometric, count: withBiometric.length });
}
