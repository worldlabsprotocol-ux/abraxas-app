// FILE: app/api/launchpad/applications/[id]/starter-kit/route.ts
// Binding-aware starter kit generation for configured applications.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { resolveApplicationPolicyBinding } from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import { buildPolicyPresentationFromTemplateId } from "@/lib/partner/launchpad/policyPresentation";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { starterKitPinFromBinding } from "@/lib/partner/starterKit/bindingPin";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/starter-kit", auth.session.partnerId, 20);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const record = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const bindingId = typeof record.binding_id === "string" ? record.binding_id.trim() : "";

  const resolved = await resolveApplicationPolicyBinding({
    application: app,
    partnerId: auth.session.partnerId,
    bindingId: bindingId || null,
  });
  if (!resolved.ok) {
    const status = resolved.code === "AMBIGUOUS_POLICY_BINDING" ? 409 : 400;
    return launchpadError(resolved.code, status);
  }

  const validated = validateStarterKitInput({
    ...record,
    pack_id: resolved.binding.pack_id,
  });
  if (!validated.ok) {
    return launchpadError(validated.code, 400);
  }

  if (validated.selection.pack_id !== resolved.binding.pack_id) {
    return launchpadError("RECEIPT_PACK_MISMATCH", 400);
  }

  const presentation = buildPolicyPresentationFromTemplateId(resolved.binding.pack_id);
  const kit = generateStarterKit({
    ...validated.selection,
    binding_pin: starterKitPinFromBinding(
      resolved.binding,
      presentation?.title ?? resolved.binding.pack_id,
    ),
  });

  if (!kit.ok) {
    return launchpadError(kit.code, 503);
  }

  if (studioPayloadLeaks({ ...kit, archive_base64: "" }).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }

  return launchpadJson({
    ok: true,
    kit,
    binding: resolved.binding,
    notice: "Starter kit pins the selected application policy binding. Policy metadata is server-resolved.",
  });
}
