// Launchpad verified onchain gate deployment registry. Browser values are untrusted.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import {
  listAppDeployments,
  onchainGateLaunchpadReadiness,
  onchainGatePayloadLeaks,
  registerOnchainGateDeployment,
  revokeOnchainGateDeployment,
} from "@/lib/partner/onchainGateDeployments";
import { ONCHAIN_GATE_CLIENT_AUTHORITY_KEYS, ONCHAIN_GATE_NOT_DEPLOYER } from "@/lib/partner/onchainGateDeployments/contract";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

function rejectAuthority(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (ONCHAIN_GATE_CLIENT_AUTHORITY_KEYS as readonly string[]).includes(key),
  );
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/onchain-gate-deployments", auth.session.partnerId, 30);
  if (limited) return limited;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  const rows = await listAppDeployments(app.partner_id, app.id);
  if (!rows) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "store_unavailable");
  const { listSignerUpdatesForApp } = await import("@/lib/partner/chainAttestationSignerLifecycle/store");
  let signer_updates: unknown[] = [];
  try {
    signer_updates = await listSignerUpdatesForApp(app.partner_id, app.id);
  } catch {
    signer_updates = [];
  }
  const view = { ...onchainGateLaunchpadReadiness(rows), signer_updates, notice: ONCHAIN_GATE_NOT_DEPLOYER };
  if (onchainGatePayloadLeaks(view).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 500, "redacted");
  return launchpadJson(view);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/onchain-gate-deployments", auth.session.partnerId, 8);
  if (limited) return limited;
  let json: unknown = {};
  try {
    const text = await req.text();
    if (text) json = JSON.parse(text);
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }
  if (rejectAuthority(json) && !(json && typeof json === "object" && "manifest" in (json as object))) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "client_override");
  }
  const rec = json && typeof json === "object" && !Array.isArray(json) ? json as Record<string, unknown> : {};
  if (rec.revoke === true && typeof rec.deployment_ref === "string") {
    const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
    if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
    const revoked = await revokeOnchainGateDeployment({
      partnerId: app.partner_id,
      applicationId: app.id,
      deploymentRef: rec.deployment_ref,
    });
    if (!revoked.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, revoked.reason);
    return launchpadJson({ ok: true, notice: ONCHAIN_GATE_NOT_DEPLOYER });
  }
  const manifest = rec.manifest ?? json;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  const registered = await registerOnchainGateDeployment({
    partnerId: app.partner_id,
    applicationId: app.id,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    appEnvironment: app.environment,
    manifest,
  });
  if (!registered.ok) {
    return launchpadJson({ ok: false, reason: registered.reason, notice: ONCHAIN_GATE_NOT_DEPLOYER }, 403);
  }
  const body = { ok: true, deployment: registered.public, notice: ONCHAIN_GATE_NOT_DEPLOYER };
  if (onchainGatePayloadLeaks(body).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 500, "redacted");
  return launchpadJson(body);
}
