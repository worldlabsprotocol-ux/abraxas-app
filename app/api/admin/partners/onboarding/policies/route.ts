// FILE: app/api/admin/partners/onboarding/policies/route.ts
// Draft policy creation and publish for partner onboarding (P1-1 immutable workflow).

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { logAdminPartnerConfigAudit } from "@/lib/admin/partnerOnboardingAudit";
import { DEFAULT_PILOT_POLICY_RULES } from "@/lib/admin/partnerOnboardingConsole";
import {
  enrichPartnerOnboardingDetail,
  loadPartnerOnboardingRecord,
} from "@/lib/admin/partnerOnboardingService";
import { PolicyImmutabilityError } from "@/lib/policy/policyLifecycle";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  createInitialPolicyDraft,
  publishPolicyDraft,
  updatePolicyDraft,
} from "@/lib/policy/policyVersioning";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "create_initial_draft" | "update_draft" | "publish";
    partner_id?: string;
    policy_id?: string;
    version?: number;
    name?: string;
    rules_json?: PartnerPolicyRules;
  };

  const partnerId = body.partner_id?.trim();
  const policyId = body.policy_id?.trim();
  if (!partnerId || !policyId) {
    return NextResponse.json({ error: "partner_id and policy_id required" }, { status: 400 });
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data: partner, error: partnerError } = await sb
      .from("partners")
      .select("partner_id")
      .eq("partner_id", partnerId)
      .maybeSingle();

    if (partnerError) {
      return NextResponse.json({ error: partnerError.message }, { status: 500 });
    }
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    switch (body.action) {
      case "create_initial_draft": {
        const draft = await createInitialPolicyDraft({
          policyId,
          partnerId,
          name: body.name?.trim() || `${partnerId} pilot policy`,
          rulesJson: body.rules_json ?? DEFAULT_PILOT_POLICY_RULES,
        });

        await sb
          .from("partners")
          .update({
            assigned_policy_id: policyId,
            updated_at: new Date().toISOString(),
          })
          .eq("partner_id", partnerId);

        await logAdminPartnerConfigAudit(req, {
          action: "admin.partner.policy.draft_create",
          object_type: "partner_policy",
          object_id: policyId,
          policy_id: policyId,
          policy_version: draft.version,
          metadata: { partner_id: partnerId, initial: true },
        });

        const record = await loadPartnerOnboardingRecord(partnerId);
        return NextResponse.json({
          ok: true,
          policy: draft,
          partner: record ? enrichPartnerOnboardingDetail(record) : null,
        });
      }

      case "update_draft": {
        if (typeof body.version !== "number") {
          return NextResponse.json({ error: "version required for update_draft" }, { status: 400 });
        }
        const draft = await updatePolicyDraft({
          policyId,
          version: body.version,
          rulesJson: body.rules_json,
          name: body.name,
        });

        await logAdminPartnerConfigAudit(req, {
          action: "admin.partner.policy.draft_update",
          object_type: "partner_policy",
          object_id: policyId,
          policy_id: policyId,
          policy_version: draft.version,
          metadata: { partner_id: partnerId },
        });

        const record = await loadPartnerOnboardingRecord(partnerId);
        return NextResponse.json({ ok: true, policy: draft, partner: record ? enrichPartnerOnboardingDetail(record) : null });
      }

      case "publish": {
        if (typeof body.version !== "number") {
          return NextResponse.json({ error: "version required for publish" }, { status: 400 });
        }
        const result = await publishPolicyDraft({ policyId, version: body.version });

        await logAdminPartnerConfigAudit(req, {
          action: "admin.partner.policy.publish",
          object_type: "partner_policy",
          object_id: policyId,
          policy_id: policyId,
          policy_version: result.published.version,
          metadata: {
            partner_id: partnerId,
            deprecated_version: result.deprecatedVersion,
          },
        });

        const record = await loadPartnerOnboardingRecord(partnerId);
        return NextResponse.json({
          ok: true,
          policy: result.published,
          deprecated_version: result.deprecatedVersion,
          partner: record ? enrichPartnerOnboardingDetail(record) : null,
        });
      }

      default:
        return NextResponse.json(
          { error: "action must be create_initial_draft, update_draft, or publish" },
          { status: 400 },
        );
    }
  } catch (e) {
    if (e instanceof PolicyImmutabilityError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Policy operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
