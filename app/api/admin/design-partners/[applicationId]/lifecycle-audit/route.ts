// FILE: app/api/admin/design-partners/[applicationId]/lifecycle-audit/route.ts
// Read-only lifecycle audit timeline for a design-partner application.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { canonicalizeLifecycleApplicationUuid } from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";
import { validateDesignPartnerLifecycleAuditQuery } from "@/lib/admin/designPartnerLifecycleAuditCursor";
import {
  classifyLifecycleAuditLoaderError,
  loadDesignPartnerLifecycleAudit,
} from "@/lib/admin/designPartnerLifecycleAuditLoader";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId: rawApplicationId } = await params;
  const applicationId = canonicalizeLifecycleApplicationUuid(rawApplicationId);
  if (!applicationId) {
    return NextResponse.json(
      { error: "Invalid request", code: "invalid_input" },
      { status: 400 },
    );
  }

  const query = validateDesignPartnerLifecycleAuditQuery(req.nextUrl.searchParams, applicationId);
  if (!query.ok) {
    return NextResponse.json(
      { error: "Invalid request", code: query.code },
      { status: 400 },
    );
  }

  try {
    const response = await loadDesignPartnerLifecycleAudit({
      applicationId,
      limit: query.value.limit,
      cursor: query.value.cursor,
    });
    return NextResponse.json(response);
  } catch (error) {
    const classified = classifyLifecycleAuditLoaderError(error);
    return NextResponse.json({ error: classified.message }, { status: classified.status });
  }
}
