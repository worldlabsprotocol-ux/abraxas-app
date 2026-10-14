// FILE: app/api/admin/identity/document-url/route.ts
// Signed URL for admin identity review — ID/selfie preview only.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { resolveAdminReviewerId } from "@/lib/admin/resolveAdminReviewerId";
import {
  readAdminEvidenceByCustody,
  SovereignEvidenceAccessDeniedError,
} from "@/lib/idv/sovereignAdminEvidenceAccess";
import type { EvidenceArtifactKind } from "@/lib/persistence/evidenceBlobStore";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SIGNED_URL_TTL_SEC = 3600;

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const storagePath = req.nextUrl.searchParams.get("path")?.trim();

  if (persistenceUsesDirectPostgres()) {
    const reviewerId = await resolveAdminReviewerId(req);
    if (!reviewerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const captureSessionId = req.nextUrl.searchParams.get("capture_session_id")?.trim();
    const artifactKind = req.nextUrl.searchParams.get("artifact_kind")?.trim() as EvidenceArtifactKind | undefined;
    if (!captureSessionId || !artifactKind) {
      return NextResponse.json({
        error: "capture_session_id and artifact_kind are required for sovereign evidence access",
      }, { status: 400 });
    }
    try {
      const { plaintext, artifactKind: kind } = await readAdminEvidenceByCustody({
        captureSessionId,
        artifactKind,
        reviewerId,
      });
      return new NextResponse(new Uint8Array(plaintext), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, no-store",
          "X-Abraxas-Evidence-Artifact": kind,
        },
      });
    } catch (error) {
      if (error instanceof SovereignEvidenceAccessDeniedError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }
  }

  if (!storagePath) {
    return NextResponse.json({ error: "Valid identity storage path required" }, { status: 400 });
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
