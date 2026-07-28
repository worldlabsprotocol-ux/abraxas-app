#!/usr/bin/env npx tsx
// FILE: scripts/seed-identity-review-queue.ts
// Seed admin identity review queue for repeatable E2E testing.
// Run: DOTENV_CONFIG_PATH=.env.local npx tsx scripts/seed-identity-review-queue.ts

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SEED_PREFIX = "seed-identity-review";
const ENGINE_VERSION = "abraxas-biometric-v2";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

type SessionKind = "pending" | "approved" | "rejected" | "resubmission_requested";

interface SeedSession {
  key: string;
  kind: SessionKind;
  legalName: string;
  email: string;
  suiAddress: string;
  engineDecision: "human_review" | "reject" | "auto_approve";
  reviewerDecision?: "approved" | "rejected" | "resubmission_requested";
  fraudRisk: number;
  faceMatch: number;
  liveness: number;
  documentType: string;
  faceDetectedSelfie: boolean;
  rejectionReasons?: string[];
}

function suiAddr(index: number): string {
  const hex = index.toString(16).padStart(64, "0");
  return `0x${hex}`;
}

function signalsFor(s: SeedSession) {
  return {
    face_detected_id: true,
    face_detected_selfie: s.faceDetectedSelfie,
    face_count_selfie: s.faceDetectedSelfie ? 1 : 0,
    face_match: s.faceMatch,
    liveness: s.liveness,
    document_type: s.documentType,
    document_confidence: s.documentType === "unknown" ? 0.22 : 0.88,
    document_aspect_score: 0.75,
    image_quality_id: 0.81,
    image_quality_selfie: s.faceDetectedSelfie ? 0.79 : 0.31,
    tamper_score: 0.06,
    fraud_risk: s.fraudRisk,
    fraud_risk_score: s.fraudRisk,
    decision: s.engineDecision,
    rejection_reasons: s.rejectionReasons ?? [],
    engine_version: ENGINE_VERSION,
  };
}

const SESSIONS: SeedSession[] = [
  // 5 pending
  { key: "pending-01", kind: "pending", legalName: "Alex Morgan", email: "alex.morgan.seed@abraxas.test", suiAddress: suiAddr(1), engineDecision: "human_review", fraudRisk: 0.14, faceMatch: 0.86, liveness: 0.81, documentType: "passport", faceDetectedSelfie: true },
  { key: "pending-02", kind: "pending", legalName: "Jordan Lee", email: "jordan.lee.seed@abraxas.test", suiAddress: suiAddr(2), engineDecision: "human_review", fraudRisk: 0.28, faceMatch: 0.72, liveness: 0.68, documentType: "drivers_license", faceDetectedSelfie: true },
  { key: "pending-03", kind: "pending", legalName: "Sam Rivera", email: "sam.rivera.seed@abraxas.test", suiAddress: suiAddr(3), engineDecision: "human_review", fraudRisk: 0.19, faceMatch: 0.79, liveness: 0.77, documentType: "national_id", faceDetectedSelfie: true },
  { key: "pending-04", kind: "pending", legalName: "Casey Nguyen", email: "casey.nguyen.seed@abraxas.test", suiAddress: suiAddr(4), engineDecision: "human_review", fraudRisk: 0.35, faceMatch: 0.65, liveness: 0.71, documentType: "passport", faceDetectedSelfie: true, rejectionReasons: ["Borderline document quality — human review recommended"] },
  { key: "pending-05", kind: "pending", legalName: "Taylor Brooks", email: "taylor.brooks.seed@abraxas.test", suiAddress: suiAddr(5), engineDecision: "human_review", fraudRisk: 0.11, faceMatch: 0.91, liveness: 0.88, documentType: "passport", faceDetectedSelfie: true },
  // 2 approved
  { key: "approved-01", kind: "approved", legalName: "Morgan Ellis", email: "morgan.ellis.seed@abraxas.test", suiAddress: suiAddr(6), engineDecision: "human_review", reviewerDecision: "approved", fraudRisk: 0.09, faceMatch: 0.89, liveness: 0.85, documentType: "passport", faceDetectedSelfie: true },
  { key: "approved-02", kind: "approved", legalName: "Riley Chen", email: "riley.chen.seed@abraxas.test", suiAddress: suiAddr(7), engineDecision: "human_review", reviewerDecision: "approved", fraudRisk: 0.07, faceMatch: 0.93, liveness: 0.9, documentType: "passport", faceDetectedSelfie: true },
  // 2 rejected
  { key: "rejected-01", kind: "rejected", legalName: "Jamie Wall", email: "jamie.wall.seed@abraxas.test", suiAddress: suiAddr(8), engineDecision: "human_review", reviewerDecision: "rejected", fraudRisk: 0.82, faceMatch: 0.41, liveness: 0.22, documentType: "unknown", faceDetectedSelfie: false, rejectionReasons: ["No face detected in selfie", "Document type could not be verified"] },
  { key: "rejected-02", kind: "rejected", legalName: "Drew Blank", email: "drew.blank.seed@abraxas.test", suiAddress: suiAddr(9), engineDecision: "human_review", reviewerDecision: "rejected", fraudRisk: 0.91, faceMatch: 0.38, liveness: 0.15, documentType: "unknown", faceDetectedSelfie: false, rejectionReasons: ["Suspected fraudulent submission", "Image quality too low"] },
  // 1 resubmission requested
  { key: "resubmit-01", kind: "resubmission_requested", legalName: "Quinn Hart", email: "quinn.hart.seed@abraxas.test", suiAddress: suiAddr(10), engineDecision: "human_review", reviewerDecision: "resubmission_requested", fraudRisk: 0.44, faceMatch: 0.58, liveness: 0.52, documentType: "passport", faceDetectedSelfie: true, rejectionReasons: ["ID glare obscures name — please resubmit"] },
];

function docStatus(kind: SessionKind): string {
  if (kind === "pending") return "submitted";
  if (kind === "approved") return "accepted";
  if (kind === "rejected") return "rejected";
  return "resubmission_requested";
}

function auditAction(kind: SessionKind): "approve" | "reject" | "request_resubmission" | null {
  if (kind === "approved") return "approve";
  if (kind === "rejected") return "reject";
  if (kind === "resubmission_requested") return "request_resubmission";
  return null;
}

async function cleanup() {
  const sessionIds = SESSIONS.map(s => `${SEED_PREFIX}-${s.key}`);

  // identity_review_audit_log is immutable (050 revokes DELETE) — only clear mutable tables.
  await sb.from("identity_biometric_assessments").delete().in("capture_session_id", sessionIds);
  await sb.from("passport_documents").delete().in("capture_session_id", sessionIds);

  console.log("✓ Cleared previous seed rows (passport_documents + biometric)");
}

async function seed() {
  console.log("=== Seeding identity review queue ===\n");
  await cleanup();

  const now = new Date().toISOString();

  for (const session of SESSIONS) {
    const captureSessionId = `${SEED_PREFIX}-${session.key}`;
    const emailSafe = session.email.replace(/[^a-zA-Z0-9]/g, "_");
    const idPath = `identity/${emailSafe}/${captureSessionId}/id_front.jpg`;
    const selfiePath = `identity/${emailSafe}/${captureSessionId}/selfie.jpg`;
    const status = docStatus(session.kind);
    const reviewed = session.kind !== "pending";

    const idDocId = randomUUID();
    const selfieDocId = randomUUID();

    const docRows = [
      {
        id: idDocId,
        user_email: session.email,
        sui_address: session.suiAddress,
        stamp_id: "identity",
        file_name: "id_front.jpg",
        storage_path: idPath,
        status,
        document_type: "id_front",
        capture_session_id: captureSessionId,
        legal_name: session.legalName,
        reviewer_note: reviewed ? `Seed ${session.kind} — automated test data` : null,
        reviewed_at: reviewed ? now : null,
        reviewed_by: reviewed ? "seed-admin" : null,
        updated_at: now,
      },
      {
        id: selfieDocId,
        user_email: session.email,
        sui_address: session.suiAddress,
        stamp_id: "identity",
        file_name: "selfie.jpg",
        storage_path: selfiePath,
        status,
        document_type: "selfie",
        capture_session_id: captureSessionId,
        legal_name: session.legalName,
        reviewer_note: reviewed ? `Seed ${session.kind} — automated test data` : null,
        reviewed_at: reviewed ? now : null,
        reviewed_by: reviewed ? "seed-admin" : null,
        updated_at: now,
      },
    ];

    const { error: docErr } = await sb.from("passport_documents").insert(docRows);
    if (docErr) throw new Error(`passport_documents ${session.key}: ${docErr.message}`);

    const sig = signalsFor(session);
    const { error: bioErr } = await sb.from("identity_biometric_assessments").insert({
      capture_session_id: captureSessionId,
      sui_address: session.suiAddress,
      face_match_score: session.faceMatch,
      liveness_score: session.liveness,
      document_quality_score: 0.81,
      selfie_quality_score: session.faceDetectedSelfie ? 0.79 : 0.31,
      decision: session.engineDecision,
      assurance_level: "L2",
      review_method: "human_biometric_match",
      engine_version: ENGINE_VERSION,
      signals: sig,
      analyzed_at: now,
      reviewer_decision: session.reviewerDecision ?? null,
      reviewer_id: reviewed ? "seed-admin" : null,
      reviewed_at: reviewed ? now : null,
    });
    if (bioErr) throw new Error(`biometric ${session.key}: ${bioErr.message}`);

    const action = auditAction(session.kind);
    if (action) {
      const { count } = await sb
        .from("identity_review_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("capture_session_id", captureSessionId);

      if ((count ?? 0) === 0) {
        const { error: auditErr } = await sb.from("identity_review_audit_log").insert({
          capture_session_id: captureSessionId,
          passport_document_id: idDocId,
          sui_address: session.suiAddress,
          reviewer_id: "seed-admin",
          action,
          previous_status: "submitted",
          new_status: status,
          engine_decision: session.engineDecision,
          reviewer_decision: session.reviewerDecision,
          rejection_reasons: session.rejectionReasons ?? null,
          notes: `Seed ${session.kind} — automated test data`,
          biometric_engine_version: ENGINE_VERSION,
        });
        if (auditErr) throw new Error(`audit ${session.key}: ${auditErr.message}`);
      }
    }

    console.log(`✓ ${session.kind.padEnd(22)} ${session.legalName} (${captureSessionId})`);
  }

  console.log(`
Summary:
  5 pending       → visible at /admin/identity?status=pending
  2 approved      → status=accepted (filter ?status=accepted)
  2 rejected      → status=rejected
  1 resubmission  → status=resubmission_requested

Re-run anytime. Clears rows matching capture_session_id prefix "${SEED_PREFIX}-".
`);
}

seed().catch(err => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
