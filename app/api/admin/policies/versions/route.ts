// FILE: app/api/admin/policies/versions/route.ts
// Operator-only policy version lifecycle (P1-1). Not self-serve partner onboarding.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { PolicyImmutabilityError } from "@/lib/policy/policyLifecycle";
import {
  createPolicyDraftFromActive,
  deprecatePolicyVersion,
  listPolicyVersions,
  publishPolicyDraft,
  updatePolicyDraft,
} from "@/lib/policy/policyVersioning";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policyId = req.nextUrl.searchParams.get("policy_id");
  if (!policyId) {
    return NextResponse.json({ error: "policy_id query param required" }, { status: 400 });
  }

  try {
    const versions = await listPolicyVersions(policyId);
    return NextResponse.json({ policy_id: policyId, versions });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to list policy versions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "create_draft" | "update_draft" | "publish" | "deprecate";
    policy_id?: string;
    version?: number;
    rules_json?: Record<string, unknown>;
    name?: string;
  };

  const policyId = body.policy_id?.trim();
  if (!policyId) {
    return NextResponse.json({ error: "policy_id required" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "create_draft": {
        const draft = await createPolicyDraftFromActive({
          policyId,
          rulesJson: body.rules_json,
          name: body.name,
        });
        return NextResponse.json({
          ok: true,
          action: "create_draft",
          policy: draft,
          operator_note: "Draft created. Edit while draft, then publish to activate and deprecate prior active version.",
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
        return NextResponse.json({ ok: true, action: "update_draft", policy: draft });
      }

      case "publish": {
        if (typeof body.version !== "number") {
          return NextResponse.json({ error: "version required for publish" }, { status: 400 });
        }
        const result = await publishPolicyDraft({ policyId, version: body.version });
        return NextResponse.json({
          ok: true,
          action: "publish",
          policy: result.published,
          deprecated_version: result.deprecatedVersion,
        });
      }

      case "deprecate": {
        if (typeof body.version !== "number") {
          return NextResponse.json({ error: "version required for deprecate" }, { status: 400 });
        }
        const policy = await deprecatePolicyVersion({ policyId, version: body.version });
        return NextResponse.json({ ok: true, action: "deprecate", policy });
      }

      default:
        return NextResponse.json(
          { error: "action must be create_draft, update_draft, publish, or deprecate" },
          { status: 400 },
        );
    }
  } catch (e: unknown) {
    if (e instanceof PolicyImmutabilityError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Policy version operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
