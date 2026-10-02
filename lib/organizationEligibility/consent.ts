import { createHash, randomBytes } from "node:crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isOrganizationResultCategory, type OrganizationResultCategory } from "./contract";
import { organizationBrowserAuthority, organizationClientOverride } from "./safety";

export const ORGANIZATION_CONSENT_KEYS = [
  "result_category",
  "purpose",
  "action",
  "action_scope",
  "environment",
] as const;

export interface OrganizationConsentRecord {
  consent_ref: string;
  partner_hmac: string;
  result_category: OrganizationResultCategory;
  purpose: string;
  action: string;
  action_scope: string;
  environment: "sandbox" | "production";
  bound: true;
  issued_at: string;
  consumed: boolean;
}

const TABLE = "organization_eligibility_consents";
const CONSENT_TTL_MS = 15 * 60 * 1000;
const consents = new Map<string, OrganizationConsentRecord>();

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function resetOrganizationConsentForTests(): void {
  consents.clear();
}

export function parseOrganizationConsentBody(body: unknown): Omit<OrganizationConsentRecord, "consent_ref" | "partner_hmac" | "bound" | "issued_at" | "consumed"> | { error: string } {
  if (organizationClientOverride(body, ORGANIZATION_CONSENT_KEYS)) {
    return { error: "invalid_input" };
  }
  const record = body as Record<string, unknown>;
  const result_category = typeof record.result_category === "string" ? record.result_category.trim() : "";
  const purpose = typeof record.purpose === "string" ? record.purpose.trim() : "";
  const action = typeof record.action === "string" ? record.action.trim() : "";
  const action_scope = typeof record.action_scope === "string" ? record.action_scope.trim() : "";
  const environment = record.environment;
  if (!isOrganizationResultCategory(result_category)) return { error: "unknown_policy" };
  if (!purpose || !action || !action_scope) return { error: "invalid_input" };
  if (environment !== "sandbox" && environment !== "production") return { error: "invalid_environment" };
  return {
    result_category,
    purpose,
    action,
    action_scope,
    environment,
  };
}

function fromRow(row: Record<string, unknown>): OrganizationConsentRecord {
  return {
    consent_ref: String(row.consent_ref),
    partner_hmac: String(row.partner_hmac),
    result_category: String(row.result_category) as OrganizationResultCategory,
    purpose: String(row.purpose),
    action: String(row.action),
    action_scope: String(row.action_scope),
    environment: row.environment === "production" ? "production" : "sandbox",
    bound: true,
    issued_at: String(row.issued_at),
    consumed: row.consumed_at != null,
  };
}

export async function createOrganizationConsent(input: {
  partnerHmac: string;
  result_category: OrganizationResultCategory;
  purpose: string;
  action: string;
  action_scope: string;
  environment: "sandbox" | "production";
}): Promise<OrganizationConsentRecord> {
  const consent_ref = `ocn_${createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 24)}`;
  const issued_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + CONSENT_TTL_MS).toISOString();
  const record: OrganizationConsentRecord = {
    consent_ref,
    partner_hmac: input.partnerHmac,
    result_category: input.result_category,
    purpose: input.purpose,
    action: input.action,
    action_scope: input.action_scope,
    environment: input.environment,
    bound: true,
    issued_at,
    consumed: false,
  };
  consents.set(consent_ref, record);

  if (skipDurableStore()) return record;

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).insert({
      consent_ref,
      partner_hmac: input.partnerHmac,
      result_category: input.result_category,
      purpose: input.purpose,
      action: input.action,
      action_scope: input.action_scope,
      environment: input.environment,
      issued_at,
      expires_at,
      consumed_at: null,
    });
    if (error) throw error;
  } catch (error) {
    if (isProductionRuntime()) {
      throw Object.assign(new Error("organization_consent_unavailable"), { code: "schema_unavailable" });
    }
    console.warn("[organization_consent] durable persist failed:", error instanceof Error ? error.message : error);
  }

  return record;
}

export async function consumeOrganizationConsent(input: {
  consent_ref: string;
  partnerHmac: string;
}): Promise<OrganizationConsentRecord | null> {
  const cached = consents.get(input.consent_ref);
  if (cached?.consumed) return null;
  if (cached && cached.partner_hmac !== input.partnerHmac) return null;

  if (skipDurableStore()) {
    if (!cached || cached.consumed) return null;
    const next = { ...cached, consumed: true };
    consents.set(input.consent_ref, next);
    return next;
  }

  try {
    const sb = requireSupabaseAdmin();
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from(TABLE)
      .update({ consumed_at: now })
      .eq("consent_ref", input.consent_ref)
      .eq("partner_hmac", input.partnerHmac)
      .is("consumed_at", null)
      .gt("expires_at", now)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      if (cached && cached.partner_hmac === input.partnerHmac && !cached.consumed) {
        const next = { ...cached, consumed: true };
        consents.set(input.consent_ref, next);
        return next;
      }
      return null;
    }
    const record = fromRow(data as Record<string, unknown>);
    consents.set(input.consent_ref, record);
    return record;
  } catch {
    if (cached && cached.partner_hmac === input.partnerHmac && !cached.consumed) {
      const next = { ...cached, consumed: true };
      consents.set(input.consent_ref, next);
      return next;
    }
    return null;
  }
}

export function loadOrganizationConsent(consent_ref: string): OrganizationConsentRecord | null {
  return consents.get(consent_ref) ?? null;
}
