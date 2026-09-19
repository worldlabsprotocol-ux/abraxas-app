// FILE: lib/partner/partnerFlowContinuation.ts
// Tenant-scoped Partner Flow continuation — server-authoritative, fail closed.

import { normalizePartnerReturnUrlForAllowlist } from "@/lib/connect/returnUrlAllowlistSemantics";
import { inferPolicyPackFromPolicyId, policyPackRequiresIdentityEvidence } from "@/lib/partner/launchpad/policyPacks";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";

export const PARTNER_FLOW_CONTINUATION_TTL_MS = 30 * 60 * 1000;
export const PARTNER_CONTINUE_PATH_PREFIX = "/partner/continue?";

const FORBIDDEN_KEYS = [
  "id_token",
  "idToken",
  "token",
  "receipt",
  "email",
  "oauth",
  "sui_address",
  "suiAddress",
  "browser_session",
  "jwt",
  "secret",
  "password",
  "pii",
];

export type PartnerFlowContinuationInput = {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  permission?: string;
  permissionVersion?: string;
  purpose?: string;
  appSlug?: string;
  policyVersion?: number;
};

export type PartnerFlowContinuationRecord = PartnerFlowContinuationInput & {
  jti: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string | null;
  verifyRequestId?: string | null;
};

export const CONTINUATION_STORE_UNAVAILABLE = "continuation_store_unavailable" as const;

export class ContinuationStoreUnavailableError extends Error {
  readonly code = CONTINUATION_STORE_UNAVAILABLE;

  constructor() {
    super(CONTINUATION_STORE_UNAVAILABLE);
    this.name = "ContinuationStoreUnavailableError";
  }
}

export type PartnerFlowContinuationStore = {
  save(record: PartnerFlowContinuationRecord): Promise<void>;
  peek(jti: string): Promise<PartnerFlowContinuationRecord | null>;
  peekByVerifyRequestId(verifyRequestId: string): Promise<PartnerFlowContinuationRecord | null>;
  consume(jti: string): Promise<PartnerFlowContinuationRecord | null>;
  attachVerifyRequestId(jti: string, verifyRequestId: string): Promise<void>;
};

export function isSafePartnerContinuationReturnUrl(value: string): boolean {
  if (typeof value !== "string" || value.trim() !== value || !value.trim()) return false;
  if (value.includes("\\")) return false;
  const lower = value.toLowerCase();
  if (
    lower.startsWith("javascript:")
    || lower.startsWith("data:")
    || lower.startsWith("vbscript:")
    || lower.startsWith("//")
  ) {
    return false;
  }
  return normalizePartnerReturnUrlForAllowlist(value) !== null;
}

export function sanitizePartnerFlowContinuation(
  input: PartnerFlowContinuationInput,
): PartnerFlowContinuationInput | null {
  const partnerId = input.partnerId.trim();
  const policyId = input.policyId.trim();
  const returnUrl = input.returnUrl.trim();
  const permission = input.permission?.trim();
  const permissionVersion = input.permissionVersion?.trim();
  const purpose = input.purpose?.trim();
  const appSlug = input.appSlug?.trim();
  const policyVersion = input.policyVersion;

  if (!partnerId || !returnUrl || (!policyId && !permission)) return null;
  if (!isSafePartnerContinuationReturnUrl(returnUrl)) return null;
  if (policyVersion != null && (!Number.isInteger(policyVersion) || policyVersion < 1)) return null;

  const normalized = normalizePartnerVerifyInput({
    partnerId,
    policyId,
    returnUrl,
    permission,
    permissionVersion,
    purpose,
  });
  if (!normalized.ok) return null;
  if (!isSafePartnerContinuationReturnUrl(normalized.params.returnUrl)) return null;

  return {
    partnerId: normalized.params.partnerId,
    policyId: normalized.params.policyId,
    returnUrl: normalized.params.returnUrl,
    permission: normalized.params.permission,
    permissionVersion: normalized.params.permissionVersion,
    purpose: normalized.params.purpose,
    appSlug: appSlug || undefined,
    policyVersion: policyVersion ?? undefined,
  };
}

export function createPartnerFlowContinuationRecord(
  input: PartnerFlowContinuationInput,
  now = Date.now(),
): PartnerFlowContinuationRecord | null {
  const sanitized = sanitizePartnerFlowContinuation(input);
  if (!sanitized) return null;
  return {
    ...sanitized,
    jti: globalThis.crypto.randomUUID(),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PARTNER_FLOW_CONTINUATION_TTL_MS).toISOString(),
    consumedAt: null,
    verifyRequestId: null,
  };
}

export function continuationIsUsable(
  record: PartnerFlowContinuationRecord | null,
  now = Date.now(),
): record is PartnerFlowContinuationRecord {
  if (!record) return false;
  if (record.consumedAt) return false;
  const expires = Date.parse(record.expiresAt);
  if (!Number.isFinite(expires) || expires <= now) return false;
  return sanitizePartnerFlowContinuation(record) !== null;
}

export function assertContinuationMatchesStored(input: {
  stored: PartnerFlowContinuationRecord;
  partnerId?: string;
  policyId?: string;
  policyVersion?: number;
  returnUrl?: string;
}): { ok: true } | { ok: false; code: string } {
  const stored = sanitizePartnerFlowContinuation(input.stored);
  if (!stored) return { ok: false, code: "invalid_continuation" };

  if (input.partnerId && input.partnerId.trim() !== stored.partnerId) {
    return { ok: false, code: "cross_partner" };
  }
  if (input.policyId && input.policyId.trim() !== stored.policyId) {
    return { ok: false, code: "altered_policy" };
  }
  if (
    input.policyVersion != null
    && stored.policyVersion != null
    && input.policyVersion !== stored.policyVersion
  ) {
    return { ok: false, code: "altered_version" };
  }
  if (input.returnUrl && input.returnUrl.trim() !== stored.returnUrl) {
    return { ok: false, code: "open_redirect" };
  }
  return { ok: true };
}

const CONTINUE_ALLOWED_KEYS = new Set(["verify_request"]);
const CONTINUE_UNTRUSTED_KEYS = new Set([
  "return",
  "return_url",
  "receipt",
  "receipt_id",
  "id_token",
  "cookie",
  "jti",
]);

export function partnerContinueHasUntrustedReturn(search: string | URLSearchParams): boolean {
  const params = typeof search === "string" ? new URLSearchParams(search.replace(/^\?/, "")) : search;
  return params.has("return") || params.has("return_url");
}

/** Visible continue query: opaque verify_request only. Strips return/receipt/cookie values. */
export function sanitizePartnerContinueBrowserSearch(
  search: string | URLSearchParams,
): { search: string; strippedUntrusted: boolean } {
  const params = typeof search === "string" ? new URLSearchParams(search.replace(/^\?/, "")) : new URLSearchParams(search);
  const verifyRequest = params.get("verify_request")?.trim() ?? "";
  const strippedUntrusted = Array.from(params.keys()).some((key) => (
    CONTINUE_UNTRUSTED_KEYS.has(key) || key !== "verify_request"
  ));
  const next = new URLSearchParams();
  if (verifyRequest) next.set("verify_request", verifyRequest);
  return { search: next.toString(), strippedUntrusted };
}

export function isRestorablePartnerContinuePath(path: string): boolean {
  if (typeof path !== "string" || path.trim() !== path) return false;
  if (!path.startsWith(PARTNER_CONTINUE_PATH_PREFIX)) return false;
  if (path.includes("://") || path.includes("\\") || path.startsWith("//")) return false;
  if (path.includes("..") || path.includes("#")) return false;
  if (!/^\/partner\/continue\?[^#]*$/.test(path)) return false;

  const params = new URLSearchParams(path.slice(PARTNER_CONTINUE_PATH_PREFIX.length));
  const keys = Array.from(params.keys());
  for (let i = 0; i < keys.length; i += 1) {
    if (!CONTINUE_ALLOWED_KEYS.has(keys[i])) return false;
  }
  if (partnerContinueHasUntrustedReturn(params)) return false;
  if (params.has("receipt") || params.has("id_token")) return false;
  const verifyRequest = params.get("verify_request")?.trim() ?? "";
  return Boolean(verifyRequest);
}

export function buildPartnerContinuePath(input: {
  verificationRequestId: string;
  partnerId?: string;
  policyId?: string;
  purpose?: string;
}): string | null {
  const verificationRequestId = input.verificationRequestId.trim();
  if (!verificationRequestId) return null;
  const search = new URLSearchParams({
    verify_request: verificationRequestId,
  });
  const path = `${PARTNER_CONTINUE_PATH_PREFIX}${search.toString()}`;
  return isRestorablePartnerContinuePath(path) ? path : null;
}

export function continuationRequestsIdentity(policyId: string): boolean {
  const pack = inferPolicyPackFromPolicyId(policyId);
  return pack ? policyPackRequiresIdentityEvidence(pack) : true;
}

export function recordHasForbiddenFields(record: Record<string, unknown>): boolean {
  return Object.keys(record).some((key) => {
    const lower = key.toLowerCase();
    return FORBIDDEN_KEYS.some((f) => lower.includes(f.toLowerCase()));
  });
}

export function createMemoryContinuationStore(
  seed: PartnerFlowContinuationRecord[] = [],
): PartnerFlowContinuationStore {
  const rows = new Map(seed.map((row) => [row.jti, { ...row }]));
  return {
    async save(record) {
      rows.set(record.jti, { ...record });
    },
    async peek(jti) {
      return rows.get(jti) ?? null;
    },
    async peekByVerifyRequestId(verifyRequestId) {
      return Array.from(rows.values()).find((row) => row.verifyRequestId === verifyRequestId) ?? null;
    },
    async consume(jti) {
      const existing = rows.get(jti);
      if (!existing || existing.consumedAt) return null;
      const consumed = { ...existing, consumedAt: new Date().toISOString() };
      rows.set(jti, consumed);
      return existing;
    },
    async attachVerifyRequestId(jti, verifyRequestId) {
      const existing = rows.get(jti);
      if (!existing) return;
      rows.set(jti, { ...existing, verifyRequestId });
    },
  };
}

export function createUnavailableContinuationStore(): PartnerFlowContinuationStore {
  const fail = async () => {
    throw new ContinuationStoreUnavailableError();
  };
  return {
    save: fail,
    peek: fail,
    peekByVerifyRequestId: fail,
    consume: fail,
    attachVerifyRequestId: fail,
  };
}
