// FILE: lib/idv/biometric/persistAssessment.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BiometricAssessment, BiometricSignals } from "./types";

function parseStoredSignals(raw: unknown): BiometricSignals {
  if (!raw || typeof raw !== "object") return {};
  return raw as BiometricSignals;
}

function reasonsFromSignals(signals: BiometricSignals): string[] {
  const reasons = signals.rejection_reasons;
  return Array.isArray(reasons) ? reasons.filter((r): r is string => typeof r === "string") : [];
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function persistBiometricAssessment(
  assessment: BiometricAssessment,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const { error } = await sb.from("identity_biometric_assessments").upsert({
    capture_session_id: assessment.capture_session_id,
    sui_address: assessment.sui_address,
    face_match_score: assessment.scores.face_match,
    liveness_score: assessment.scores.liveness,
    document_quality_score: assessment.scores.document_quality,
    selfie_quality_score: assessment.scores.selfie_quality,
    decision: assessment.decision,
    assurance_level: assessment.assurance_level,
    review_method: assessment.review_method,
    engine_version: assessment.engine_version,
    signals: {
      ...assessment.signals,
      rejection_reasons: assessment.reasons,
    },
    analyzed_at: assessment.analyzed_at,
  }, { onConflict: "capture_session_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getBiometricAssessment(
  captureSessionId: string,
): Promise<BiometricAssessment | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data } = await sb
    .from("identity_biometric_assessments")
    .select("*")
    .eq("capture_session_id", captureSessionId)
    .maybeSingle();

  if (!data) return null;

  return {
    capture_session_id: data.capture_session_id,
    sui_address: data.sui_address,
    scores: {
      face_match: Number(data.face_match_score),
      liveness: Number(data.liveness_score),
      document_quality: Number(data.document_quality_score),
      selfie_quality: Number(data.selfie_quality_score),
    },
    decision: data.decision,
    assurance_level: data.assurance_level,
    review_method: data.review_method,
    engine_version: data.engine_version,
    signals: (data.signals as BiometricSignals) ?? {},
    reasons: reasonsFromSignals(parseStoredSignals(data.signals)),
    analyzed_at: data.analyzed_at,
  };
}
