// FILE: app/api/admin/partners/production-environment/reverse/route.ts
// Production-only partner environment reversal — strict session + atomic RPC.

import { NextRequest } from "next/server";
import { guardPartnerFlowProductionReadinessRoute } from "@/lib/admin/partnerFlowProductionRouteGate";
import {
  guardProductionAdminMutationOrigin,
  handleProductionEnvPromotionPost,
  parseReversePromotionBody,
} from "@/lib/admin/partnerProductionEnvPromotion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = guardPartnerFlowProductionReadinessRoute(req);
  if (blocked) return blocked;

  const originBlocked = guardProductionAdminMutationOrigin(req);
  if (originBlocked) return originBlocked;

  return handleProductionEnvPromotionPost(req, "reverse", parseReversePromotionBody);
}
