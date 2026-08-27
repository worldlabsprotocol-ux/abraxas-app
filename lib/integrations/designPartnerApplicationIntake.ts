// FILE: lib/integrations/designPartnerApplicationIntake.ts
// Design partner public apply intake — bounded body, validation, best-effort dedup lookup.

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DESIGN_PARTNER_APPLY_MAX_BODY_BYTES = 12 * 1024;
export const DESIGN_PARTNER_APPLY_DEDUP_WINDOW_HOURS = 168;
export const DESIGN_PARTNER_APPLY_HONEYPOT_FIELD = "website_url_confirm";

const ALLOWED_BODY_KEYS = new Set([
  "company",
  "contact_name",
  "email",
  "website",
  "integration_type",
  "use_case",
  "monthly_volume",
  "public_name_ok",
  DESIGN_PARTNER_APPLY_HONEYPOT_FIELD,
]);

const INTEGRATION_TYPES = new Set([
  "passport_gate",
  "identity_only",
  "asset_attestation",
  "lending_collateral",
]);

const DEDUP_STATUSES = ["submitted", "approved", "onboarded"] as const;

const EMAIL_MAX_LEN = 254;
const COMPANY_MAX_LEN = 120;
const COMPANY_MIN_LEN = 2;
const CONTACT_NAME_MAX_LEN = 80;
const USE_CASE_MAX_LEN = 4000;
const MONTHLY_VOLUME_MAX_LEN = 80;
const WEBSITE_MAX_LEN = 2048;

const ASCII_CONTROL_EXCEPT_NEWLINE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const ASCII_CONTROL_STRICT = /[\x00-\x1F\x7F]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DesignPartnerApplicationRow {
  company: string;
  contact_name: string | null;
  email: string;
  website: string | null;
  use_case: string | null;
  monthly_volume: string | null;
  integration_type: string;
  public_name_ok: boolean;
  status: "submitted";
}

export type DesignPartnerApplicationParseResult =
  | { ok: true; action: "insert"; row: DesignPartnerApplicationRow; emailDedupNorm: string; companyDedupNorm: string }
  | { ok: true; action: "discard" }
  | { ok: false };

export interface BoundedBodyReadResult {
  ok: true;
  text: string;
  cancel?: () => Promise<void>;
}

export interface BoundedBodyReadError {
  ok: false;
  cancel?: () => Promise<void>;
}

/** Escape ILIKE metacharacters so applicant input cannot broaden PostgREST ILIKE filters. */
export function escapePostgrestIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function collapseInternalWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Stored email: preserve local part; lowercase domain only. */
export function normalizeEmailForStorage(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  return `${local}@${domain}`;
}

/** In-memory case-folded value for best-effort duplicate comparison only — not a DB column. */
export function normalizeEmailForDedupComparison(email: string): string {
  return email.trim().toLowerCase();
}

/** In-memory normalized company for best-effort duplicate comparison only — not a DB column. */
export function normalizeCompanyForDedupComparison(company: string): string {
  return collapseInternalWhitespace(company).toLowerCase();
}

export function isDesignPartnerProductionWebsiteRuntime(): boolean {
  return process.env.VERCEL === "1" && process.env.NODE_ENV === "production";
}

export function validateOptionalWebsiteUrl(
  raw: string,
  options?: { productionWebsite?: boolean },
): { ok: true; value: string } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false };

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false };
  }

  if (parsed.username || parsed.password) return { ok: false };
  if (parsed.hash) return { ok: false };
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { ok: false };

  const production = options?.productionWebsite ?? isDesignPartnerProductionWebsiteRuntime();
  if (production && parsed.protocol !== "https:") return { ok: false };

  if (parsed.protocol === "http:") {
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) return { ok: false };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  if (!isLocalHost) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return { ok: false };
    if (host.includes(":")) return { ok: false };
  }

  const canonical = parsed.toString();
  if (canonical.length > WEBSITE_MAX_LEN) return { ok: false };
  return { ok: true, value: canonical };
}

function hasStrictControlChars(value: string): boolean {
  return ASCII_CONTROL_STRICT.test(value);
}

function hasDisallowedControlChars(value: string): boolean {
  return ASCII_CONTROL_EXCEPT_NEWLINE.test(value);
}

function parseOptionalTextField(
  value: unknown,
  maxLen: number,
  options?: { allowNewlines?: boolean },
): string | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return "invalid";
  if (options?.allowNewlines) {
    if (hasDisallowedControlChars(trimmed)) return "invalid";
  } else if (hasStrictControlChars(trimmed)) {
    return "invalid";
  }
  return trimmed;
}

function parseRequiredCompany(value: unknown): string | "invalid" {
  if (typeof value !== "string") return "invalid";
  const collapsed = collapseInternalWhitespace(value);
  if (collapsed.length < COMPANY_MIN_LEN || collapsed.length > COMPANY_MAX_LEN) return "invalid";
  if (hasStrictControlChars(collapsed)) return "invalid";
  return collapsed;
}

function parseRequiredEmail(value: unknown): string | "invalid" {
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > EMAIL_MAX_LEN) return "invalid";
  if (hasStrictControlChars(trimmed) || /\s/.test(trimmed)) return "invalid";
  if (!EMAIL_PATTERN.test(trimmed)) return "invalid";
  return normalizeEmailForStorage(trimmed);
}

function parseIntegrationType(value: unknown): string | "invalid" {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    return "passport_gate";
  }
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!INTEGRATION_TYPES.has(trimmed)) return "invalid";
  return trimmed;
}

function parsePublicNameOk(value: unknown): boolean | "invalid" {
  if (value === undefined) return false;
  if (typeof value !== "boolean") return "invalid";
  return value;
}

export type DesignPartnerApplicationEnvelopeResult =
  | { ok: false }
  | { ok: true; action: "honeypot" }
  | { ok: true; action: "continue" };

export function validateDesignPartnerApplicationEnvelope(
  body: unknown,
): DesignPartnerApplicationEnvelopeResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false };

  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_BODY_KEYS.has(key)) return { ok: false };
  }

  const honeypot = record[DESIGN_PARTNER_APPLY_HONEYPOT_FIELD];
  if (honeypot !== undefined && honeypot !== null && String(honeypot).trim() !== "") {
    return { ok: true, action: "honeypot" };
  }

  return { ok: true, action: "continue" };
}

export function parseDesignPartnerApplicationFields(
  body: unknown,
): Exclude<DesignPartnerApplicationParseResult, { ok: true; action: "discard" }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false };

  const record = body as Record<string, unknown>;

  const company = parseRequiredCompany(record.company);
  if (company === "invalid") return { ok: false };

  const email = parseRequiredEmail(record.email);
  if (email === "invalid") return { ok: false };

  const contactName = parseOptionalTextField(record.contact_name, CONTACT_NAME_MAX_LEN);
  if (contactName === "invalid") return { ok: false };

  let website: string | null = null;
  if (record.website !== undefined && record.website !== null) {
    if (typeof record.website !== "string") return { ok: false };
    const websiteTrimmed = record.website.trim();
    if (websiteTrimmed) {
      const websiteResult = validateOptionalWebsiteUrl(websiteTrimmed);
      if (!websiteResult.ok) return { ok: false };
      website = websiteResult.value;
    }
  }

  const integrationType = parseIntegrationType(record.integration_type);
  if (integrationType === "invalid") return { ok: false };

  const useCase = parseOptionalTextField(record.use_case, USE_CASE_MAX_LEN, { allowNewlines: true });
  if (useCase === "invalid") return { ok: false };

  const monthlyVolume = parseOptionalTextField(record.monthly_volume, MONTHLY_VOLUME_MAX_LEN);
  if (monthlyVolume === "invalid") return { ok: false };

  const publicNameOk = parsePublicNameOk(record.public_name_ok);
  if (publicNameOk === "invalid") return { ok: false };

  const emailDedupNorm = normalizeEmailForDedupComparison(email);
  const companyDedupNorm = normalizeCompanyForDedupComparison(company);

  return {
    ok: true,
    action: "insert",
    emailDedupNorm,
    companyDedupNorm,
    row: {
      company,
      contact_name: contactName,
      email,
      website,
      use_case: useCase,
      monthly_volume: monthlyVolume,
      integration_type: integrationType,
      public_name_ok: publicNameOk,
      status: "submitted",
    },
  };
}

export function parseDesignPartnerApplicationBody(body: unknown): DesignPartnerApplicationParseResult {
  const envelope = validateDesignPartnerApplicationEnvelope(body);
  if (!envelope.ok) return { ok: false };
  if (envelope.action === "honeypot") return { ok: true, action: "discard" };
  return parseDesignPartnerApplicationFields(body);
}

export async function readBoundedJsonBody(
  req: NextRequest,
  maxBytes: number = DESIGN_PARTNER_APPLY_MAX_BODY_BYTES,
): Promise<(BoundedBodyReadResult | BoundedBodyReadError) & { cancel?: () => Promise<void> }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number.parseInt(contentLength, 10);
    if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes) {
      return { ok: false };
    }
  }

  const stream = req.body;
  if (!stream) return { ok: false };

  const reader = stream.getReader();
  const cancel = async () => {
    try {
      await reader.cancel();
    } catch {
      // ignore cancel failures
    }
  };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await cancel();
        return { ok: false, cancel };
      }
      chunks.push(value);
    }
  } catch {
    await cancel();
    return { ok: false, cancel };
  }

  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return { ok: false, cancel };
  }

  return { ok: true, text, cancel };
}

export function getDesignPartnerDedupWindowStartIso(
  windowHours: number = DESIGN_PARTNER_APPLY_DEDUP_WINDOW_HOURS,
  nowMs: number = Date.now(),
): string {
  return new Date(nowMs - windowHours * 3_600_000).toISOString();
}

/**
 * Best-effort duplicate lookup — NOT atomic and NOT idempotent.
 * Uses in-memory normalized values against existing email/company columns via ILIKE
 * with escaped patterns (case-insensitive literal match).
 */
export async function findRecentDuplicateDesignPartnerApplication(
  sb: SupabaseClient,
  input: {
    emailDedupNorm: string;
    companyDedupNorm: string;
    windowHours?: number;
    nowMs?: number;
  },
): Promise<{ duplicate: boolean; id?: string }> {
  const windowStart = getDesignPartnerDedupWindowStartIso(input.windowHours, input.nowMs);
  const emailPattern = escapePostgrestIlikePattern(input.emailDedupNorm);
  const companyPattern = escapePostgrestIlikePattern(input.companyDedupNorm);

  const { data, error } = await sb
    .from("design_partners")
    .select("id")
    .in("status", [...DEDUP_STATUSES])
    .gte("created_at", windowStart)
    .ilike("email", emailPattern)
    .ilike("company", companyPattern)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { duplicate: false };
  }

  if (!data?.id) {
    return { duplicate: false };
  }

  return { duplicate: true, id: data.id as string };
}
