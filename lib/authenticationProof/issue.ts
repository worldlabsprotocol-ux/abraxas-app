// FILE: lib/authenticationProof/issue.ts
// Issue signed authentication proof + optional Sui on-chain anchor.

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getActiveSuiNetwork } from "@/lib/sui/config";
import { suiExplorerTxUrl } from "@/lib/sui/network";
import { anchorAuthenticationProofOnSui } from "@/lib/sui/anchorAuthenticationProof";
import { signAuthProofPayload } from "./signing";
import { extractAssetAbxId } from "./proofLifecycle";
import type {
  AuthenticationEventType,
  AuthenticationProofPayload,
  AuthenticationProofRecord,
  IssuedAuthenticationProof,
} from "./types";
import { AUTH_PROOF_SCHEMA_VERSION } from "./types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function newProofId(): string {
  return `aprx_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function hashRecordPayload(data: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(data, Object.keys(data).sort()), "utf8")
    .digest("hex");
}

export function buildAuthProofPayload(input: {
  eventType: AuthenticationEventType;
  recordId: string;
  payloadHash: string;
  proofId?: string;
}): AuthenticationProofPayload {
  return {
    proof_id: input.proofId ?? newProofId(),
    schema_version: AUTH_PROOF_SCHEMA_VERSION,
    event_type: input.eventType,
    record_id: input.recordId,
    payload_hash: input.payloadHash,
    issued_at: new Date().toISOString(),
    network: getActiveSuiNetwork(),
  };
}

export async function issueAuthenticationProof(input: {
  eventType: AuthenticationEventType;
  recordId: string;
  recordPayload: Record<string, unknown>;
  assetAbxId?: string | null;
}): Promise<IssuedAuthenticationProof> {
  const recordHash = hashRecordPayload(input.recordPayload);
  const assetAbxId = input.assetAbxId ?? extractAssetAbxId(input.recordPayload, input.recordId);
  const authPayload = buildAuthProofPayload({
    eventType: input.eventType,
    recordId: input.recordId,
    payloadHash: recordHash,
  });

  const signed = signAuthProofPayload(authPayload);
  const signature = signed?.signature ?? "";
  const signingKeyId = signed?.signingKeyId ?? "unsigned";

  const anchor = await anchorAuthenticationProofOnSui({
    eventType: input.eventType,
    recordId: input.recordId,
    payloadHash: recordHash,
  });

  const anchorStatus = anchor.txDigest
    ? "anchored" as const
    : anchor.attempted
      ? "anchor_failed" as const
      : "signed" as const;

  const suiTxDigest = anchor.txDigest ?? null;
  const explorerUrl = suiTxDigest ? suiExplorerTxUrl(suiTxDigest) : null;
  const network = getActiveSuiNetwork();

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    await sb.from("authentication_proofs").insert({
      id: authPayload.proof_id,
      event_type: input.eventType,
      record_id: input.recordId,
      payload_hash: recordHash,
      signature: signature || "unsigned",
      signing_key_id: signingKeyId,
      sui_tx_digest: suiTxDigest,
      sui_network: network,
      anchor_status: anchorStatus,
      explorer_url: explorerUrl,
      issued_at: authPayload.issued_at,
      schema_version: authPayload.schema_version,
      network,
      status: "active",
      asset_abx_id: assetAbxId,
      superseded_by: null,
    });
  }

  return {
    proof_id: authPayload.proof_id,
    payload_hash: recordHash,
    signature,
    signing_key_id: signingKeyId,
    anchor_status: anchorStatus,
    sui_tx_digest: suiTxDigest,
    explorer_url: explorerUrl,
    verify_url: `/api/proof/${authPayload.proof_id}`,
    issued_at: authPayload.issued_at,
    event_type: input.eventType,
    record_id: input.recordId,
    network,
    status: "active",
  };
}

export async function getAuthenticationProof(id: string): Promise<AuthenticationProofRecord | null> {
  if (!SB_URL || !SB_KEY) return null;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("authentication_proofs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const createdAt = data.created_at as string;
  return {
    id: data.id as string,
    event_type: data.event_type as AuthenticationProofRecord["event_type"],
    record_id: data.record_id as string,
    payload_hash: data.payload_hash as string,
    signature: data.signature as string,
    signing_key_id: data.signing_key_id as string,
    sui_tx_digest: (data.sui_tx_digest as string | null) ?? null,
    sui_network: (data.sui_network as string | null) ?? null,
    anchor_status: data.anchor_status as AuthenticationProofRecord["anchor_status"],
    explorer_url: (data.explorer_url as string | null) ?? null,
    issued_at: (data.issued_at as string | null) ?? createdAt,
    schema_version: (data.schema_version as string | null) ?? AUTH_PROOF_SCHEMA_VERSION,
    network: (data.network as string | null) ?? (data.sui_network as string | null) ?? getActiveSuiNetwork(),
    created_at: createdAt,
    status: (data.status as AuthenticationProofRecord["status"] | null) ?? "active",
    asset_abx_id: (data.asset_abx_id as string | null) ?? null,
    superseded_by: (data.superseded_by as string | null) ?? null,
  };
}
