// FILE: app/api/verification/[assetId]/advance/route.ts
// Advances an asset through the verification pipeline.
// Requires authorized partner action. Records immutable audit entry.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient }         from "@/lib/supabase";
import {
  canAdvanceStage,
  computeConfidenceScore,
  computeRiskScore,
  getAdjustedLTV,
  type VerificationRecord,
}                                    from "@/lib/protocol/verificationEngine";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  const { assetId } = params;
  const body = await req.json().catch(() => null);
  if (!body?.partnerId || !body?.stageResult) {
    return NextResponse.json({ error:"partnerId and stageResult required" }, { status:400 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error:"Database not configured" }, { status:503 });
  }

  // Fetch current record
  const { data: existing } = await db
    .from("verification_records")
    .select("*")
    .eq("asset_id", assetId)
    .single();

  if (!existing) {
    return NextResponse.json({ error:"Verification record not found" }, { status:404 });
  }

  const record: VerificationRecord = {
    ...existing,
    stages:     JSON.parse(existing.stages || "[]"),
    fraudFlags: existing.fraud_flags || [],
  };

  // Update current stage record
  const stageIdx = record.currentStage - 1;
  if (stageIdx < 0 || stageIdx >= record.stages.length) {
    return NextResponse.json({ error:"Invalid stage index" }, { status:400 });
  }

  record.stages[stageIdx] = {
    ...record.stages[stageIdx],
    partnerId:           body.partnerId,
    partnerName:         body.partnerName,
    status:              body.stageResult === "pass" ? "passed" : "failed",
    completedAt:         Date.now(),
    notes:               body.notes,
    documentsReceived:   body.documentsProvided ?? [],
  };

  // Advance or reject
  if (body.stageResult === "pass") {
    if (record.currentStage < record.totalStages) {
      record.currentStage += 1;
      record.status = "PARTNER_REQUIRED";
    } else {
      // All stages passed
      record.status    = "APPROVED";
      record.completedAt = Date.now();
    }
  } else {
    if (body.critical) {
      record.status = "REJECTED";
      record.rejectionReason = body.notes;
      record.rejectedAt = Date.now();
    } else {
      record.status = "ADDITIONAL_DOCS";
    }
  }

  // Recompute scores
  record.confidenceScore = computeConfidenceScore(record);
  record.riskScore       = computeRiskScore(record);
  record.updatedAt       = Date.now();

  const adjustedLTV = getAdjustedLTV(record.assetClass, record.confidenceScore);

  // Persist updated record
  await db.from("verification_records").update({
    current_stage:    record.currentStage,
    status:           record.status,
    stages:           JSON.stringify(record.stages),
    confidence_score: record.confidenceScore,
    risk_score:       record.riskScore,
    completed_at:     record.completedAt ? new Date(record.completedAt).toISOString() : null,
    rejected_at:      record.rejectedAt  ? new Date(record.rejectedAt).toISOString()  : null,
    rejection_reason: record.rejectionReason,
    updated_at:       new Date().toISOString(),
  }).eq("asset_id", assetId);

  // Update asset status in assets table
  const newAssetStatus = record.status === "APPROVED"
    ? "collateral_eligible"
    : record.status === "REJECTED"
    ? "rejected"
    : "pending_verification";

  await db.from("assets").update({
    status: newAssetStatus,
    ltv:    adjustedLTV,
  }).eq("id", assetId);

  // Log immutable audit event
  await db.from("verification_reviews").insert({
    asset_id:    assetId,
    reviewer:    body.partnerId,
    action:      body.stageResult === "pass" ? "approved" : "rejected",
    from_status: existing.status,
    to_status:   record.status,
    note:        body.notes,
  });

  await db.from("asset_events").insert({
    asset_id:   assetId,
    event_type: "VERIFICATION_STAGE_ADVANCED",
    actor:      body.partnerId,
    payload:    {
      stage:           record.currentStage,
      result:          body.stageResult,
      confidenceScore: record.confidenceScore,
      adjustedLTV,
    },
  });

  // Notify asset owner
  if (record.ownerWallet) {
    await db.from("notifications").insert({
      wallet:   record.ownerWallet,
      asset_id: assetId,
      type:     record.status === "APPROVED" ? "borrow_eligible" : "status_change",
      message:  record.status === "APPROVED"
        ? "Your asset has been fully verified and is now eligible for USDC borrowing via Loopscale."
        : `Your asset verification has been updated. Status: ${record.status.replace(/_/g," ")}.`,
    });
  }

  return NextResponse.json({
    success:         true,
    newStatus:       record.status,
    currentStage:    record.currentStage,
    confidenceScore: record.confidenceScore,
    adjustedLTV,
  });
}