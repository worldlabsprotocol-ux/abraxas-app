// FILE: app/api/admin/identity/queue/route.ts
// Manual identity review queue — grouped Abraxas capture sessions with partner context.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/adminAuth";
import {
  sanitizeBiometricForList,
  subjectLabelFromAddress,
  type IdentityReviewQueueListItem,
} from "@/lib/admin/identityReviewQueueResponse";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

interface DocRow {
  id: string;
  created_at: string;
  updated_at: string | null;
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

interface SessionRow {
  capture_session_id: string;
  partner_id: string | null;
  policy_id: string | null;
  verification_request_id: string | null;
  review_status: string;
  engine_decision: string | null;
  eligibility_result: string | null;
  raw_evidence_purged_at: string | null;
  updated_at: string;
}

function mapStatusFilter(status: string): { docStatuses: string[]; sessionStatuses: string[] } {
  if (status === "pending") {
    return { docStatuses: ["submitted", "under_review"], sessionStatuses: ["pending"] };
  }
  if (status === "accepted") {
    return { docStatuses: ["accepted"], sessionStatuses: ["approved"] };
  }
  if (status === "rejected") {
    return { docStatuses: ["rejected"], sessionStatuses: ["rejected"] };
  }
  if (status === "resubmission_requested") {
    return { docStatuses: ["resubmission_requested"], sessionStatuses: ["expired"] };
  }
  return { docStatuses: [], sessionStatuses: [] };
}

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim() || null;
  const includePii = req.nextUrl.searchParams.get("detail") === "true";
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  let query = sb
    .from("passport_documents")
    .select("id, created_at, updated_at, user_email, sui_address, file_name, storage_path, status, reviewer_note, document_type, capture_session_id, legal_name")
    .eq("stamp_id", "identity")
    .order("created_at", { ascending: false })
    .limit(200);

  const { docStatuses } = mapStatusFilter(status);
  if (status === "pending") {
    query = query.in("status", docStatuses);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as DocRow[];
  const sessionIds = rows
    .map(r => r.capture_session_id)
    .filter((id): id is string => Boolean(id));

  const sessionsByCapture = new Map<string, SessionRow>();
  if (sessionIds.length > 0) {
    let sessionQuery = sb
      .from("identity_review_sessions")
      .select("capture_session_id, partner_id, policy_id, verification_request_id, review_status, engine_decision, eligibility_result, raw_evidence_purged_at, updated_at")
      .in("capture_session_id", sessionIds);

    if (partnerId) {
      sessionQuery = sessionQuery.eq("partner_id", partnerId);
    }

    const { data: sessions } = await sessionQuery;
    for (const row of sessions ?? []) {
      sessionsByCapture.set(row.capture_session_id as string, row as SessionRow);
    }
  }

  const grouped = new Map<string, DocRow & { documents: DocRow[] }>();
  for (const row of rows) {
    const key = row.capture_session_id ?? row.id;
    const session = row.capture_session_id
      ? sessionsByCapture.get(row.capture_session_id)
      : undefined;
    if (partnerId && row.capture_session_id && !session) {
      continue;
    }
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

  const biometricBySession = new Map<string, Record<string, unknown>>();
  if (sessionIds.length > 0) {
    const { data: assessments } = await sb
      .from("identity_biometric_assessments")
      .select("capture_session_id, face_match_score, liveness_score, document_quality_score, selfie_quality_score, decision, assurance_level, review_method, engine_version, reviewer_decision, reviewer_id, reviewed_at, signals")
      .in("capture_session_id", sessionIds);

    for (const row of assessments ?? []) {
      biometricBySession.set(row.capture_session_id as string, row as Record<string, unknown>);
    }
  }

  const items: IdentityReviewQueueListItem[] = Array.from(grouped.values()).map(item => {
    const session = item.capture_session_id
      ? sessionsByCapture.get(item.capture_session_id)
      : undefined;
    const biometric = item.capture_session_id
      ? biometricBySession.get(item.capture_session_id) ?? null
      : null;

    const base: IdentityReviewQueueListItem = {
      id: item.id,
      created_at: item.created_at,
      updated_at: session?.updated_at ?? item.updated_at,
      sui_address: item.sui_address,
      status: item.status,
      capture_session_id: item.capture_session_id,
      capture_complete: item.capture_session_id
        ? item.documents.some(d => d.document_type === "id_front")
          && item.documents.some(d => d.document_type === "selfie")
        : true,
      has_selfie: item.documents.some(d => d.document_type === "selfie"),
      has_id_front: item.documents.some(d => d.document_type === "id_front"),
      partner_id: session?.partner_id ?? (biometric?.signals as { partner_id?: string } | undefined)?.partner_id ?? null,
      policy_id: session?.policy_id ?? null,
      verification_request_id: session?.verification_request_id ?? null,
      review_status: session?.review_status ?? null,
      engine_decision: session?.engine_decision ?? (biometric?.decision as string | undefined) ?? null,
      eligibility_result: session?.eligibility_result ?? null,
      raw_evidence_purged_at: session?.raw_evidence_purged_at ?? null,
      subject_label: subjectLabelFromAddress(item.sui_address),
      biometric: sanitizeBiometricForList(biometric),
    };

    if (includePii) {
      return {
        ...base,
        user_email: item.user_email,
        legal_name: item.legal_name,
        documents: item.documents.map(d => ({
          id: d.id,
          document_type: d.document_type,
          storage_path: d.storage_path,
        })),
      } as IdentityReviewQueueListItem & {
        user_email?: string;
        legal_name?: string | null;
        documents?: Array<{ id: string; document_type: string | null; storage_path: string }>;
      };
    }

    return base;
  });

  return NextResponse.json({ items, count: items.length });
}
