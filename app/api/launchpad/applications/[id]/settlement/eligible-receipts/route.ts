// FILE: app/api/launchpad/applications/[id]/settlement/eligible-receipts/route.ts
// Partner-scoped eligible receipts. Labels only — never raw receipt ids.

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
  eligibleReceiptListHasForbiddenMaterial,
  listEligibleSettlementReceipts,
} from "@/lib/settlement/circle/eligibleReceipts";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/settlement/eligible-receipts",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const receipts = await listEligibleSettlementReceipts({
    application: app,
    partnerId: auth.session.partnerId,
    sessionKeyId: auth.session.apiKeyId,
  });
  const payload = {
    ok: true,
    environment: "sandbox" as const,
    receipts,
  };
  if (eligibleReceiptListHasForbiddenMaterial(payload)) {
    return launchpadJson({ ok: true, environment: "sandbox", receipts: [] });
  }
  return launchpadJson(payload);
}
