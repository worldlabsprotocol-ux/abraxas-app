// FILE: app/api/auth/wallet/sandbox/workspace/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { getEphemeralSandboxGuidedProgressForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress";
import { loadEphemeralSandboxTestResult } from "@/lib/auth/ephemeralWallet/sandboxTestVerification";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { buildServerAuthoritativeJourneySnapshot } from "@/lib/developers/serverAuthoritativeJourney";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  try {
    const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
    const guidedProgress = await getEphemeralSandboxGuidedProgressForSession(auth.session.sessionId);
    let guidedResult: Record<string, unknown> | null = null;
    if (
      workspace
      && guidedProgress
      && guidedProgress.workspace_id === workspace.workspace_id
      && guidedProgress.receipt_id
    ) {
      const stored = await loadEphemeralSandboxTestResult(guidedProgress.receipt_id);
      if (stored && String(stored.workspace_id) === workspace.workspace_id) {
        guidedResult = stored as Record<string, unknown>;
      }
    }
    const authoritative_journey = buildServerAuthoritativeJourneySnapshot({
      guidedProgress,
      workspaceExpiresAt: workspace?.expires_at ?? null,
    });
    return NextResponse.json({
      ok: true,
      workspace,
      guided_progress: guidedProgress,
      guided_result: guidedResult,
      authoritative_journey,
      test_only: true,
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
