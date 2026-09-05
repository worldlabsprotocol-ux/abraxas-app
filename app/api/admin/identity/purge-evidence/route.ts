// FILE: app/api/admin/identity/purge-evidence/route.ts
// Operator-only raw identity evidence purge (dry-run supported).

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import {
  findPurgeEligibleSessions,
  purgeAllEligibleRawEvidence,
  purgeRawEvidenceForSession,
} from "@/lib/idv/rawEvidencePurge";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as {
    capture_session_id?: string;
    dry_run?: boolean;
    batch?: boolean;
    force?: boolean;
    limit?: number;
  };

  const dryRun = body.dry_run === true;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  if (body.batch) {
    const batch = await purgeAllEligibleRawEvidence({ dryRun, limit: body.limit });
    return NextResponse.json(batch, { status: batch.ok ? 200 : 207 });
  }

  if (body.capture_session_id) {
    const result = await purgeRawEvidenceForSession(body.capture_session_id, {
      dryRun,
      sb,
      force: body.force === true,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const eligible = await findPurgeEligibleSessions(sb, { limit: body.limit ?? 50 });
  if (!eligible.ok) {
    return NextResponse.json({ error: eligible.error }, { status: 400 });
  }

  return NextResponse.json({
    dry_run: dryRun,
    eligible_count: eligible.sessions.length,
    session_ids: eligible.sessions.map(s => s.session_id),
    capture_session_ids: eligible.sessions.map(s => s.capture_session_id),
  });
}

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const captureSessionId = req.nextUrl.searchParams.get("capture_session_id")?.trim();
  const eligible = await findPurgeEligibleSessions(sb, {
    captureSessionId: captureSessionId || undefined,
    limit: 100,
  });

  if (!eligible.ok) {
    return NextResponse.json({ error: eligible.error }, { status: 400 });
  }

  return NextResponse.json({
    eligible_count: eligible.sessions.length,
    sessions: eligible.sessions,
  });
}
