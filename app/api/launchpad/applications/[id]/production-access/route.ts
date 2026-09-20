// FILE: app/api/launchpad/applications/[id]/production-access/route.ts
// Reviewed Production-access request. Delegates to go-live. Never auto-approves.

import { NextRequest } from "next/server";
import { GET as goLiveGet, POST as goLivePost } from "@/app/api/launchpad/applications/[id]/go-live/route";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return goLiveGet(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return goLivePost(req, ctx);
}
