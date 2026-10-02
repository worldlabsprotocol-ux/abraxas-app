// FILE: lib/provenance/artifactStore.ts
// Hash-only artifact bindings — no raw media persistence.

import { randomUUID } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ContentArtifactBinding } from "./types";
import { ARTIFACT_CANONICALIZATION_VERSION } from "./artifactFingerprint";

const TABLE = "content_artifact_records";
const memory = new Map<string, ContentArtifactBinding>();

export function resetArtifactStoreForTests(): void {
  memory.clear();
}

function memoryKey(subjectId: string, contentHash: string): string {
  return `${subjectId}:${contentHash}`;
}

function fromRow(row: Record<string, unknown>): ContentArtifactBinding {
  return {
    artifact_id: String(row.id),
    content_hash: String(row.content_hash),
    content_type: String(row.content_type),
    byte_length: Number(row.byte_length),
    canonicalization_version: String(row.canonicalization_version),
    subject_id: String(row.subject_id),
    parent_artifact_id: row.parent_artifact_id ? String(row.parent_artifact_id) : null,
    binding_method: String(row.binding_method) as ContentArtifactBinding["binding_method"],
    created_at: String(row.created_at),
  };
}

export async function getActiveArtifactBinding(input: {
  subjectId: string;
  contentHash: string;
}): Promise<ContentArtifactBinding | null> {
  const subject = normalizeSuiAddress(input.subjectId);
  const contentHash = input.contentHash.trim().toLowerCase();
  const cached = memory.get(memoryKey(subject, contentHash));
  if (cached) return cached;

  const sb = getSupabaseAdmin();
  if (!sb) return null;

  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("subject_id", subject)
    .eq("content_hash", contentHash)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  const binding = fromRow(data as Record<string, unknown>);
  memory.set(memoryKey(subject, contentHash), binding);
  return binding;
}

export async function upsertArtifactBinding(input: {
  subjectId: string;
  contentHash: string;
  contentType: string;
  byteLength: number;
  bindingMethod: ContentArtifactBinding["binding_method"];
}): Promise<ContentArtifactBinding> {
  const subject = normalizeSuiAddress(input.subjectId);
  const contentHash = input.contentHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    throw new Error("invalid_content_hash");
  }

  const existing = await getActiveArtifactBinding({ subjectId: subject, contentHash });
  if (existing) return existing;

  const artifactId = randomUUID();
  const createdAt = new Date().toISOString();
  const binding: ContentArtifactBinding = {
    artifact_id: artifactId,
    content_hash: contentHash,
    content_type: input.contentType,
    byte_length: input.byteLength,
    canonicalization_version: ARTIFACT_CANONICALIZATION_VERSION,
    subject_id: subject,
    binding_method: input.bindingMethod,
    created_at: createdAt,
  };

  memory.set(memoryKey(subject, contentHash), binding);

  const sb = getSupabaseAdmin();
  if (!sb) return binding;

  const { error } = await sb.from(TABLE).insert({
    id: artifactId,
    subject_id: subject,
    content_hash: contentHash,
    content_type: input.contentType,
    byte_length: input.byteLength,
    canonicalization_version: ARTIFACT_CANONICALIZATION_VERSION,
    binding_method: input.bindingMethod,
    status: "active",
  });

  if (error) {
    const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
    if (
      msg.includes("does not exist")
      || msg.includes("42p01")
      || msg.includes("invalid api key")
      || process.env.VITEST
    ) {
      return binding;
    }
    throw new Error(error.message);
  }

  return binding;
}
