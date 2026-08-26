// FILE: app/api/admin/partners/sandbox-signoff/route.ts
// Admin sandbox pilot sign-off — server-owned JSONB CAS on partners.onboarding_checklist.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import {
  applyChecklistCasFilter,
  applySandboxSignoffCasUpdate,
  buildNextChecklist,
  defaultSandboxPilotSignoff,
  findForbiddenClientChecklistField,
  mergeSignoffPatch,
  readSandboxPilotSignoff,
  sanitizeSignoffForResponse,
  splitPriorChecklist,
  type ChecklistCasFilter,
  type SandboxSignoffGetResponse,
  type SandboxSignoffPatchBody,
} from "@/lib/admin/partnerSandboxSignoff";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const NOT_FOUND = { error: "Partner not found" };

async function loadPromotedApplication(partnerId: string) {
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("design_partners")
    .select("id, status, promoted_partner_id, reviewer_notes")
    .eq("promoted_partner_id", partnerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function loadPartnerRow(partnerId: string) {
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("partners")
    .select("partner_id, onboarding_checklist, updated_at")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

function buildGetResponse(
  partnerId: string,
  row: { updated_at: string; onboarding_checklist: unknown },
  application: { id: string; status: string; reviewer_notes: string | null } | null,
): SandboxSignoffGetResponse {
  const { priorChecklist } = splitPriorChecklist(row.onboarding_checklist);
  const applicationId = application?.id ?? null;
  const signoff = readSandboxPilotSignoff(priorChecklist, applicationId);
  return {
    partner_id: partnerId,
    updated_at: row.updated_at,
    signoff: sanitizeSignoffForResponse(signoff, applicationId),
    application: application ? { id: application.id, status: application.status } : null,
    reviewer_notes: application?.reviewer_notes ?? null,
  };
}

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim();
  if (!partnerId) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  try {
    const application = await loadPromotedApplication(partnerId);
    if (!application) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    const row = await loadPartnerRow(partnerId);
    if (!row) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    return NextResponse.json(buildGetResponse(partnerId, row, application));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load sign-off";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as SandboxSignoffPatchBody & Record<string, unknown>;
  const forbidden = findForbiddenClientChecklistField(body);
  if (forbidden) {
    return NextResponse.json({ error: `Field not allowed: ${forbidden}` }, { status: 400 });
  }

  const partnerId = body.partner_id?.trim();
  if (!partnerId) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  try {
    const application = await loadPromotedApplication(partnerId);
    if (!application) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    const row = await loadPartnerRow(partnerId);
    if (!row) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    const { rawPriorChecklist, priorChecklist } = splitPriorChecklist(row.onboarding_checklist);
    const applicationId = application.id;
    const priorSignoff = readSandboxPilotSignoff(priorChecklist, applicationId);

    let nextSignoff;
    try {
      nextSignoff = mergeSignoffPatch(priorSignoff, body, applicationId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid sign-off patch";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const nextChecklist = buildNextChecklist(priorChecklist, nextSignoff);
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

    const casResult = await applySandboxSignoffCasUpdate(
      async (filter: ChecklistCasFilter, payload) => {
        let query = sb
          .from("partners")
          .update(payload)
          .eq("partner_id", partnerId);
        query = applyChecklistCasFilter(query, filter);
        const { data, error } = await query
          .select("partner_id, updated_at")
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? { updated_at: data.updated_at as string } : null;
      },
      rawPriorChecklist,
      priorChecklist,
      nextChecklist,
    );

    if (!casResult.ok) {
      return NextResponse.json(
        { error: "checklist_conflict", message: "Refresh and retry" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      buildGetResponse(
        partnerId,
        { updated_at: casResult.updated_at, onboarding_checklist: nextChecklist },
        application,
      ),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save sign-off";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
