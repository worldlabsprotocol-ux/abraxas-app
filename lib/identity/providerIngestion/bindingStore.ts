// FILE: lib/identity/providerIngestion/bindingStore.ts
// Provider subject ref → Abraxas subject binding. Ref stored hashed only.

import { createHash } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createIndividualSubject,
  getIdentitySubjectById,
  type IdentitySubjectRecord,
} from "@/lib/identity/subject/subjectStore";

const BINDING_HASH_NAMESPACE = "abraxas-provider-subject-ref-v1";

export function hashProviderSubjectRef(providerId: string, providerSubjectRef: string): string {
  return createHash("sha256")
    .update(`${BINDING_HASH_NAMESPACE}:${providerId}:${providerSubjectRef}`, "utf8")
    .digest("hex");
}

export type BindingResolveResult =
  | { ok: true; subject: IdentitySubjectRecord; created: boolean }
  | { ok: false; code: "binding_conflict"; existingSubjectId: string }
  | { ok: false; code: "subject_inactive" }
  | { ok: false; code: "db_error"; detail?: string };

export async function resolveProviderSubjectBinding(input: {
  providerId: string;
  providerSubjectRef: string;
}): Promise<BindingResolveResult> {
  const sb = requireSupabaseAdmin();
  const refHash = hashProviderSubjectRef(input.providerId, input.providerSubjectRef);

  const { data: existing } = await sb
    .from("provider_subject_bindings")
    .select("abraxas_subject_id, status")
    .eq("provider_id", input.providerId)
    .eq("provider_subject_ref_hash", refHash)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "active") {
      return { ok: false, code: "subject_inactive" };
    }
    const subject = await getIdentitySubjectById(existing.abraxas_subject_id as string);
    if (!subject || subject.status !== "active") {
      return { ok: false, code: "subject_inactive" };
    }
    return { ok: true, subject, created: false };
  }

  const subject = await createIndividualSubject();
  const { error } = await sb.from("provider_subject_bindings").insert({
    provider_id: input.providerId,
    provider_subject_ref_hash: refHash,
    abraxas_subject_id: subject.id,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await sb
        .from("provider_subject_bindings")
        .select("abraxas_subject_id")
        .eq("provider_id", input.providerId)
        .eq("provider_subject_ref_hash", refHash)
        .maybeSingle();
      if (raced?.abraxas_subject_id) {
        const racedSubject = await getIdentitySubjectById(raced.abraxas_subject_id as string);
        if (racedSubject) {
          return { ok: true, subject: racedSubject, created: false };
        }
      }
      return { ok: false, code: "binding_conflict", existingSubjectId: "unknown" };
    }
    return { ok: false, code: "db_error", detail: error.message };
  }

  return { ok: true, subject, created: true };
}

export async function getBindingForSubject(input: {
  providerId: string;
  abraxasSubjectId: string;
}): Promise<{ providerId: string; status: string } | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("provider_subject_bindings")
    .select("provider_id, status")
    .eq("provider_id", input.providerId)
    .eq("abraxas_subject_id", input.abraxasSubjectId)
    .maybeSingle();
  if (!data) return null;
  return {
    providerId: data.provider_id as string,
    status: data.status as string,
  };
}
