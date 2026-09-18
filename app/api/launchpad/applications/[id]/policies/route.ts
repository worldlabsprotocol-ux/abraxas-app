// FILE: app/api/launchpad/applications/[id]/policies/route.ts
// Partner Launchpad Policy Change Control: lifecycle, adoption, and offline fixtures.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";
import { PolicyImmutabilityError } from "@/lib/policy/policyLifecycle";
import { getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import {
  adoptPolicyVersionForApplication,
  buildPolicyChangeControlOverview,
  createPartnerPolicyDraftSuccessor,
  deletePartnerPolicyDraft,
  deprecatePartnerPolicyVersion,
  editPartnerPolicyDraft,
  evaluatePolicyFixture,
  fixtureInputContainsForbiddenKeys,
  publishPartnerPolicyDraftVersion,
} from "@/lib/policy/changeControl";
import type { PartnerPolicyRules } from "@/lib/policy/types";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

function mapError(error: unknown) {
  if (error instanceof PolicyChangeControlError) {
    const status = error.code === "policy_wrong_partner" ? 403 : 409;
    return launchpadError(error.code, status, error.message);
  }
  if (error instanceof PolicyImmutabilityError) {
    return launchpadError("policy_immutability_violation", 409, error.message);
  }
  const message = error instanceof Error ? error.message : "policy_change_control_failed";
  return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.policy_version_blocked, 400, message);
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  try {
    const overview = await buildPolicyChangeControlOverview({
      policyId: app.policy_id,
      partnerId: auth.session.partnerId,
      focusApplication: app,
    });
    return launchpadJson({
      ok: true,
      application_id: app.id,
      pinned_version: app.policy_version,
      ...overview,
    });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/applications/policies", 20);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: {
    action?: string;
    version?: number;
    rules_json?: PartnerPolicyRules;
    name?: string;
    deprecate_effective_at?: string | null;
    fixture_claims?: Array<{ claim_type: string; assurance_level?: "L0" | "L1" | "L2" | "L3" | "L4"; present?: boolean }>;
  };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const actorId = auth.session.partnerId;

  try {
    switch (body.action) {
      case "create_draft": {
        const draft = await createPartnerPolicyDraftSuccessor({
          policyId: app.policy_id,
          partnerId: auth.session.partnerId,
          actorId,
          rulesJson: body.rules_json,
          name: body.name,
        });
        return launchpadJson({ ok: true, action: "create_draft", draft });
      }
      case "update_draft": {
        if (typeof body.version !== "number") {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "version required");
        }
        const draft = await editPartnerPolicyDraft({
          policyId: app.policy_id,
          partnerId: auth.session.partnerId,
          version: body.version,
          actorId,
          rulesJson: body.rules_json,
          name: body.name,
        });
        return launchpadJson({ ok: true, action: "update_draft", draft });
      }
      case "publish": {
        if (typeof body.version !== "number") {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "version required");
        }
        const result = await publishPartnerPolicyDraftVersion({
          policyId: app.policy_id,
          partnerId: auth.session.partnerId,
          version: body.version,
          actorId,
        });
        return launchpadJson({
          ok: true,
          action: "publish",
          published: result.published,
          deprecated_version: result.deprecatedVersion,
          notice: "Integrations keep their pinned version until they explicitly adopt the published successor.",
        });
      }
      case "deprecate": {
        if (typeof body.version !== "number") {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "version required");
        }
        const policy = await deprecatePartnerPolicyVersion({
          policyId: app.policy_id,
          partnerId: auth.session.partnerId,
          version: body.version,
          actorId,
          deprecateEffectiveAt: body.deprecate_effective_at,
        });
        return launchpadJson({ ok: true, action: "deprecate", policy });
      }
      case "adopt": {
        if (typeof body.version !== "number") {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "version required");
        }
        const result = await adoptPolicyVersionForApplication({
          application: app,
          toVersion: body.version,
          actorId,
        });
        return launchpadJson({
          ok: true,
          action: "adopt",
          from_version: result.from_version,
          to_version: result.to_version,
          idempotent_replay: result.idempotent_replay,
          application_id: result.application.id,
          policy_version: result.application.policy_version,
        });
      }
      case "delete_draft": {
        if (typeof body.version !== "number") {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "version required");
        }
        await deletePartnerPolicyDraft({
          policyId: app.policy_id,
          partnerId: auth.session.partnerId,
          version: body.version,
        });
        return launchpadJson({ ok: true, action: "delete_draft" });
      }
      case "fixture": {
        if (typeof body.version !== "number") {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "version required");
        }
        if (fixtureInputContainsForbiddenKeys(body)) {
          return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "fixture_forbidden_fields");
        }
        const policy = await getPartnerPolicyAtVersion(app.policy_id, body.version);
        if (!policy || policy.partner_id !== auth.session.partnerId) {
          return launchpadError("policy_version_unknown", 404);
        }
        const result = evaluatePolicyFixture({
          policy,
          partnerId: auth.session.partnerId,
          claims: body.fixture_claims,
        });
        return launchpadJson({
          ok: true,
          action: "fixture",
          simulated: true,
          ...result,
        });
      }
      default:
        return launchpadError(
          LAUNCHPAD_PUBLIC_ERRORS.invalid_input,
          400,
          "action must be create_draft, update_draft, publish, deprecate, adopt, delete_draft, or fixture",
        );
    }
  } catch (error) {
    return mapError(error);
  }
}
