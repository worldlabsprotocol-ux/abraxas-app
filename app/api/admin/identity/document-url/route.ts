// FILE: app/api/admin/identity/document-url/route.ts
// Signed URL for admin identity review — ID/selfie preview only.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { readEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SIGNED_URL_TTL_SEC = 3600;

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const storagePath = req.nextUrl.searchParams.get("path")?.trim();
  if (!storagePath) {
    return NextResponse.json({ error: "Valid identity storage path required" }, { status: 400 });
  }

  if (persistenceUsesDirectPostgres()) {
    const custody = await queryAbraxasPg<{ holder_subject_id: string; capture_session_id: string; artifact_kind: string }>(
      `select holder_subject_id, capture_session_id, artifact_kind from public.abraxas_evidence_custody
       where storage_path = $1 limit 1`,
      [storagePath],
    );
    const row = custody.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Evidence custody record not found" }, { status: 404 });
    }
    try {
      const plain = readEncryptedEvidence({ storagePath });
      const contentType = row.artifact_kind === "selfie" ? "image/jpeg" : "image/jpeg";
      return new NextResponse(new Uint8Array(plain), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, no-store",
          "X-Abraxas-Evidence-Artifact": row.artifact_kind,
        },
      });
    } catch {
      return NextResponse.json({ error: "Could not decrypt evidence" }, { status: 404 });
    }
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  if (!storagePath.startsWith("identity/")) {
    return NextResponse.json({ error: "Valid identity storage path required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.storage
    .from("passport-documents")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 404 });
  }

  return NextResponse.json({
    signed_url: data.signedUrl,
    expires_in_sec: SIGNED_URL_TTL_SEC,
  });
}
