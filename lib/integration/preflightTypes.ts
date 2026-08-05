// FILE: lib/integration/preflightTypes.ts
// Integration-readiness preflight result types.

export type PreflightStatus = "pass" | "fail" | "pending" | "blocked";

export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  evidence: string;
}

export interface PreflightResult {
  checks: PreflightCheck[];
  summary: Record<PreflightStatus, number>;
  productionMode: boolean;
  baseUrl: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  exitCode: number;
}

export interface PreflightOptions {
  baseUrl: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  productionMode: boolean;
}

export interface PartnerRow {
  partner_id: string;
  status: string | null;
  allowed_return_urls: string[] | null;
  is_external: boolean | null;
  onboarding_checklist: unknown;
  assigned_policy_id: string | null;
}

export interface PartnerPolicyRow {
  id: string;
  partner_id: string;
  status: string;
}

export interface PreflightDeps {
  fetch: typeof fetch;
  readFile: (path: string) => string;
  fileExists: (path: string) => boolean;
  env: Record<string, string | undefined>;
  loadPartner?: (partnerId: string) => Promise<PartnerRow | null>;
  loadPolicy?: (policyId: string) => Promise<PartnerPolicyRow | null>;
  isReturnUrlAllowed?: (partnerId: string, returnUrl: string) => Promise<boolean>;
}
