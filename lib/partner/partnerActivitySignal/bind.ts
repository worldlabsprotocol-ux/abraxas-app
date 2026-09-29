// FILE: lib/partner/partnerActivitySignal/bind.ts
// Receipt-bound activity signal contracts. Server-issued only.
//
// Authoritative: fields on PartnerActivitySignalBinding issued by issuePartnerActivitySignalBinding().
// Untrusted input: any binding object received from HTTP/client code — always re-normalize and verify
// binding_integrity_hash before preflight.

import { createHash } from "node:crypto";
import type { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { createActionNonce } from "@/lib/partner/portableActionContract/issue";
import {
  PARTNER_ACTIVITY_BINDING_KEYS,
  PARTNER_ACTIVITY_RECEIPT_REQUIREMENT,
  isPartnerActivitySignalType,
  type PartnerActivitySignalType,
} from "./contract";

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;

export interface PartnerActivitySignalBinding {
  partner_id: string;
  policy_id: string;
  policy_version: number;
  receipt_id: string;
  receipt_payload_hash: string;
  activity_signal_type: PartnerActivitySignalType;
  purpose: string;
  action_scope: string;
  environment: "sandbox" | "production";
  receipt_requirement: typeof PARTNER_ACTIVITY_RECEIPT_REQUIREMENT;
  issued_at: string;
  expires_at: string;
  nonce: string;
  binding_integrity_hash: `0x${string}`;
}

export type ActivityBindingIntegrityFields = Omit<PartnerActivitySignalBinding, "binding_integrity_hash">;

export function hashActivitySignalBinding(binding: ActivityBindingIntegrityFields): string {
  const canonical = [
    binding.partner_id,
    binding.policy_id,
    String(binding.policy_version),
    binding.receipt_id,
    binding.receipt_payload_hash,
    binding.activity_signal_type,
    binding.purpose,
    binding.action_scope,
    binding.environment,
    binding.issued_at,
    binding.expires_at,
    binding.nonce,
    binding.receipt_requirement,
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function bindingIntegrityHash(binding: ActivityBindingIntegrityFields): `0x${string}` {
  return `0x${hashActivitySignalBinding(binding)}` as `0x${string}`;
}

export function verifyBindingIntegrityHash(binding: PartnerActivitySignalBinding): boolean {
  const { binding_integrity_hash, ...rest } = binding;
  return binding_integrity_hash.toLowerCase() === bindingIntegrityHash(rest);
}

export function issuePartnerActivitySignalBinding(input: {
  kit: AbraxasPartnerKit;
  receipt_id: string;
  receipt_payload_hash: string;
  activity_signal_type: string;
  purpose: string;
  action_scope: string;
  ttlMs?: number;
  now?: Date;
}): PartnerActivitySignalBinding | { ok: false; reason: "invalid_activity_signal" | "invalid" } {
  const receiptId = input.receipt_id.trim();
  const payloadHash = input.receipt_payload_hash.trim();
  if (!receiptId || !/^0x[0-9a-fA-F]{64}$/.test(payloadHash)) {
    return { ok: false, reason: "invalid" };
  }
  if (!isPartnerActivitySignalType(input.activity_signal_type)) {
    return { ok: false, reason: "invalid_activity_signal" };
  }
  const purpose = input.purpose.trim();
  const actionScope = input.action_scope.trim();
  if (!purpose || !actionScope) return { ok: false, reason: "invalid" };

  const now = input.now ?? new Date();
  const ttl = Math.min(Math.max(input.ttlMs ?? DEFAULT_TTL_MS, 30_000), MAX_TTL_MS);
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttl).toISOString();
  const body: ActivityBindingIntegrityFields = {
    partner_id: input.kit.options.partnerId,
    policy_id: input.kit.options.policyId,
    policy_version: input.kit.options.policyVersion ?? 1,
    receipt_id: receiptId,
    receipt_payload_hash: payloadHash.toLowerCase(),
    activity_signal_type: input.activity_signal_type,
    purpose,
    action_scope: actionScope,
    environment: input.kit.options.environment,
    receipt_requirement: PARTNER_ACTIVITY_RECEIPT_REQUIREMENT,
    issued_at: issuedAt,
    expires_at: expiresAt,
    nonce: createActionNonce(),
  };
  return {
    ...body,
    binding_integrity_hash: bindingIntegrityHash(body),
  };
}

export function normalizePartnerActivitySignalBinding(input: {
  binding: unknown;
}): PartnerActivitySignalBinding | { ok: false; reason: "invalid" | "invalid_activity_signal" | "binding_integrity_mismatch" } {
  if (!input.binding || typeof input.binding !== "object" || Array.isArray(input.binding)) {
    return { ok: false, reason: "invalid" };
  }
  const raw = input.binding as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !(PARTNER_ACTIVITY_BINDING_KEYS as readonly string[]).includes(key))) {
    return { ok: false, reason: "invalid" };
  }
  if (raw.receipt_requirement !== PARTNER_ACTIVITY_RECEIPT_REQUIREMENT) {
    return { ok: false, reason: "invalid" };
  }
  const activityType = typeof raw.activity_signal_type === "string" ? raw.activity_signal_type : "";
  if (!isPartnerActivitySignalType(activityType)) {
    return { ok: false, reason: "invalid_activity_signal" };
  }
  const receiptPayloadHash = typeof raw.receipt_payload_hash === "string" ? raw.receipt_payload_hash.trim() : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(receiptPayloadHash)) {
    return { ok: false, reason: "invalid" };
  }
  const integrityHash = typeof raw.binding_integrity_hash === "string" ? raw.binding_integrity_hash.trim() : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(integrityHash)) {
    return { ok: false, reason: "invalid" };
  }
  const environment = raw.environment === "production" ? "production" : raw.environment === "sandbox" ? "sandbox" : null;
  if (!environment) return { ok: false, reason: "invalid" };
  const nonce = typeof raw.nonce === "string" ? raw.nonce.trim() : "";
  const expiresAt = typeof raw.expires_at === "string" ? raw.expires_at : "";
  const issuedAt = typeof raw.issued_at === "string" ? raw.issued_at : "";
  const receiptId = typeof raw.receipt_id === "string" ? raw.receipt_id.trim() : "";
  const purpose = typeof raw.purpose === "string" ? raw.purpose.trim() : "";
  const actionScope = typeof raw.action_scope === "string" ? raw.action_scope.trim() : "";
  if (!nonce || !expiresAt || !issuedAt || !receiptId || !purpose || !actionScope) {
    return { ok: false, reason: "invalid" };
  }
  const binding: PartnerActivitySignalBinding = {
    partner_id: typeof raw.partner_id === "string" ? raw.partner_id : "",
    policy_id: typeof raw.policy_id === "string" ? raw.policy_id : "",
    policy_version: typeof raw.policy_version === "number" ? raw.policy_version : Number.NaN,
    receipt_id: receiptId,
    receipt_payload_hash: receiptPayloadHash.toLowerCase(),
    activity_signal_type: activityType,
    purpose,
    action_scope: actionScope,
    environment,
    receipt_requirement: PARTNER_ACTIVITY_RECEIPT_REQUIREMENT,
    issued_at: issuedAt,
    expires_at: expiresAt,
    nonce,
    binding_integrity_hash: integrityHash.toLowerCase() as `0x${string}`,
  };
  if (!verifyBindingIntegrityHash(binding)) {
    return { ok: false, reason: "binding_integrity_mismatch" };
  }
  return binding;
}
