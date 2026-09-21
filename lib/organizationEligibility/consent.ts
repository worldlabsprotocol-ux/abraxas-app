import { createHash, randomBytes } from "node:crypto";
import { ORGANIZATION_RESULT_CATEGORIES, type OrganizationResultCategory } from "./contract";
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

const consents = new Map<string, OrganizationConsentRecord>();

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
  if (!(ORGANIZATION_RESULT_CATEGORIES as readonly string[]).includes(result_category)) return { error: "unknown_policy" };
  if (!purpose || !action || !action_scope) return { error: "invalid_input" };
  if (environment !== "sandbox" && environment !== "production") return { error: "invalid_environment" };
  return {
    result_category: result_category as OrganizationResultCategory,
    purpose,
    action,
    action_scope,
    environment,
  };
}

export function createOrganizationConsent(input: {
  partnerHmac: string;
  result_category: OrganizationResultCategory;
  purpose: string;
  action: string;
  action_scope: string;
  environment: "sandbox" | "production";
}): OrganizationConsentRecord {
  const consent_ref = `ocn_${createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 24)}`;
  const record: OrganizationConsentRecord = {
    consent_ref,
    partner_hmac: input.partnerHmac,
    result_category: input.result_category,
    purpose: input.purpose,
    action: input.action,
    action_scope: input.action_scope,
    environment: input.environment,
    bound: true,
    issued_at: new Date().toISOString(),
    consumed: false,
  };
  consents.set(consent_ref, record);
  return record;
}

export function consumeOrganizationConsent(input: {
  consent_ref: string;
  partnerHmac: string;
}): OrganizationConsentRecord | null {
  const record = consents.get(input.consent_ref);
  if (!record || record.consumed) return null;
  if (record.partner_hmac !== input.partnerHmac) return null;
  const next = { ...record, consumed: true };
  consents.set(input.consent_ref, next);
  return next;
}

export function loadOrganizationConsent(consent_ref: string): OrganizationConsentRecord | null {
  return consents.get(consent_ref) ?? null;
}
