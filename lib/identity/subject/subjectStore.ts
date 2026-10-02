// FILE: lib/identity/subject/subjectStore.ts
// Durable individual identity subjects. Internal only — never partner-visible.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  claimsSubjectKeyForAbraxasSubject,
  generateAbraxasSubjectId,
} from "./claimsSubjectKey";

export type IdentitySubjectType = "individual" | "organization";
export type IdentitySubjectStatus = "active" | "revoked" | "merged";

export interface IdentitySubjectRecord {
  id: string;
  subject_type: IdentitySubjectType;
  claims_subject_key: string;
  status: IdentitySubjectStatus;
  created_at: string;
  updated_at: string;
}

export async function createIndividualSubject(): Promise<IdentitySubjectRecord> {
  const sb = requireSupabaseAdmin();
  const id = generateAbraxasSubjectId();
  const claimsSubjectKey = claimsSubjectKeyForAbraxasSubject(id);
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("identity_subjects")
    .insert({
      id,
      subject_type: "individual",
      claims_subject_key: claimsSubjectKey,
      status: "active",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create identity subject");
  }

  return data as IdentitySubjectRecord;
}

export async function getIdentitySubjectById(id: string): Promise<IdentitySubjectRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("identity_subjects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as IdentitySubjectRecord | null) ?? null;
}

export async function getIdentitySubjectByClaimsKey(
  claimsSubjectKey: string,
): Promise<IdentitySubjectRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("identity_subjects")
    .select("*")
    .eq("claims_subject_key", claimsSubjectKey)
    .maybeSingle();
  return (data as IdentitySubjectRecord | null) ?? null;
}

/** Wallet-less compatibility: map claims storage key back to internal Abraxas subject. */
export async function resolveAbraxasSubjectFromClaimsKey(
  claimsSubjectKey: string,
): Promise<IdentitySubjectRecord | null> {
  return getIdentitySubjectByClaimsKey(claimsSubjectKey);
}
