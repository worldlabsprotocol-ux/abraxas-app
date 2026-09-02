// FILE: lib/partner/partnerVerifyResume.ts
// Persist validated partner-verify entry across zkLogin OAuth redirect.
// Stores only partner flow identifiers — never tokens, receipts, or PII.

const STORAGE_KEY = "abraxas_partner_verify_resume_v1";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const PARTNER_VERIFY_PATH_PREFIX = "/partner/verify?";

const ALLOWED_RESUME_KEYS = new Set([
  "partnerId",
  "policyId",
  "returnUrl",
  "permission",
  "permissionVersion",
  "savedAt",
]);

export type PartnerVerifyResumeParams = {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  permission?: string;
  permissionVersion?: string;
};

export type PartnerVerifyResumeState = PartnerVerifyResumeParams & {
  savedAt: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Only same-origin relative paths beginning with /partner/verify? may be restored.
 * Rejects absolute URLs, protocol-relative URLs, backslashes, and non-partner paths.
 */
export function isRestorablePartnerVerifyPath(path: string): boolean {
  if (!isNonEmptyString(path)) return false;
  const trimmed = path.trim();
  if (trimmed !== path) return false;
  if (!trimmed.startsWith(PARTNER_VERIFY_PATH_PREFIX)) return false;
  if (trimmed.includes("://")) return false;
  if (trimmed.includes("\\")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.includes("..")) return false;
  if (trimmed.includes("#")) return false;
  if (!/^\/partner\/verify\?[^#]*$/.test(trimmed)) return false;
  return true;
}

function hasForbiddenResumeFields(record: Record<string, unknown>): boolean {
  const forbidden = [
    "id_token",
    "idToken",
    "token",
    "verifier",
    "receipt",
    "receipt_id",
    "receiptId",
    "email",
    "oauth_sub",
    "oauthSub",
    "sui_address",
    "suiAddress",
    "browser_session",
    "browserSession",
    "jwt",
    "secret",
    "password",
    "pii",
  ];
  return Object.keys(record).some((key) => {
    if (!ALLOWED_RESUME_KEYS.has(key)) return true;
    const lower = key.toLowerCase();
    return forbidden.some((f) => lower.includes(f));
  });
}

function isSafeReturnUrlForResume(value: string): boolean {
  if (!isNonEmptyString(value)) return false;
  const trimmed = value.trim();
  if (trimmed !== value) return false;
  if (trimmed.includes("\\")) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:")
    || lower.startsWith("data:")
    || lower.startsWith("vbscript:")
    || lower.startsWith("//")
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeResumeParams(
  params: PartnerVerifyResumeParams,
): PartnerVerifyResumeParams | null {
  const partnerId = params.partnerId.trim();
  const policyId = params.policyId.trim();
  const returnUrl = params.returnUrl.trim();
  const permission = params.permission?.trim();
  const permissionVersion = params.permissionVersion?.trim();

  if (!partnerId || !returnUrl || (!policyId && !permission)) return null;
  if (!isSafeReturnUrlForResume(returnUrl)) return null;

  const built = buildPartnerVerifyPath({
    partnerId,
    policyId,
    returnUrl,
    permission,
    permissionVersion,
  });
  if (!isRestorablePartnerVerifyPath(built)) return null;

  return {
    partnerId,
    policyId,
    returnUrl,
    permission: permission || undefined,
    permissionVersion: permissionVersion || undefined,
  };
}

export function buildPartnerVerifyPath(params: PartnerVerifyResumeParams): string {
  const search = new URLSearchParams({
    partner_id: params.partnerId.trim(),
    return_url: params.returnUrl.trim(),
  });
  if (params.policyId.trim()) search.set("policy_id", params.policyId.trim());
  if (params.permission?.trim()) search.set("permission", params.permission.trim());
  if (params.permissionVersion?.trim()) {
    search.set("permission_version", params.permissionVersion.trim());
  }
  return `${PARTNER_VERIFY_PATH_PREFIX}${search.toString()}`;
}

export function parsePartnerVerifyResumeParams(
  searchParams: URLSearchParams,
): PartnerVerifyResumeParams | null {
  const partnerId = (
    searchParams.get("relying_party_id")
    ?? searchParams.get("partner_id")
    ?? ""
  ).trim();
  const returnUrl = (searchParams.get("return_url") ?? "").trim();
  const policyId = (searchParams.get("policy_id") ?? "").trim();
  const permission = (searchParams.get("permission") ?? "").trim();
  const permissionVersion = (searchParams.get("permission_version") ?? "").trim();

  if (!partnerId || !returnUrl || (!policyId && !permission)) return null;

  return sanitizeResumeParams({
    partnerId,
    policyId,
    returnUrl,
    permission: permission || undefined,
    permissionVersion: permissionVersion || undefined,
  });
}

export function savePartnerVerifyResume(params: PartnerVerifyResumeParams): void {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeResumeParams(params);
  if (!sanitized) {
    clearPartnerVerifyResume();
    return;
  }

  const state: PartnerVerifyResumeState = {
    ...sanitized,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadPartnerVerifyResume(): PartnerVerifyResumeState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (hasForbiddenResumeFields(parsed)) {
      clearPartnerVerifyResume();
      return null;
    }

    const state: PartnerVerifyResumeState = {
      partnerId: typeof parsed.partnerId === "string" ? parsed.partnerId.trim() : "",
      policyId: typeof parsed.policyId === "string" ? parsed.policyId.trim() : "",
      returnUrl: typeof parsed.returnUrl === "string" ? parsed.returnUrl.trim() : "",
      permission: typeof parsed.permission === "string" ? parsed.permission.trim() : undefined,
      permissionVersion: typeof parsed.permissionVersion === "string"
        ? parsed.permissionVersion.trim()
        : undefined,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt.trim() : "",
    };

    if (
      !isNonEmptyString(state.partnerId)
      || !isNonEmptyString(state.returnUrl)
      || (!isNonEmptyString(state.policyId) && !isNonEmptyString(state.permission))
      || !isNonEmptyString(state.savedAt)
    ) {
      clearPartnerVerifyResume();
      return null;
    }

    const ageMs = Date.now() - new Date(state.savedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_AGE_MS) {
      clearPartnerVerifyResume();
      return null;
    }

    const sanitized = sanitizeResumeParams(state);
    if (!sanitized) {
      clearPartnerVerifyResume();
      return null;
    }

    return { ...sanitized, savedAt: state.savedAt };
  } catch {
    clearPartnerVerifyResume();
    return null;
  }
}

export function consumePartnerVerifyResumePath(): string | null {
  const state = loadPartnerVerifyResume();
  if (!state) return null;

  const path = buildPartnerVerifyPath(state);
  sessionStorage.removeItem(STORAGE_KEY);

  if (!isRestorablePartnerVerifyPath(path)) return null;
  return path;
}

export function clearPartnerVerifyResume(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
